# Interview Prep Copilot — Design

Date: 2026-10-27
Status: Awaiting the author's approval

## 1. Intent and the why

TrackIQ is a portfolio project aimed at **AI engineer roles**. The goal of this
feature is to show interviewers that the author can build a real AI system
(retrieval, embeddings, a vector database, LLM orchestration, and evaluation),
not just call an API — and to be able to **explain every part comfortably**.

The feature: a user opens a job in TrackIQ and asks the copilot to prep them for
an upcoming interview round. The copilot retrieves the job description, the
user's interview notes for this job, and related notes from *other* jobs, then
returns:

- **Likely questions** for this round, each with why it's likely
- **Recurring weak spots** across the user's notes
- **A short study plan** tied to their skills profile

**Every item cites its sources** (a note or the job description). This keeps
TrackIQ's existing promise — "every score shows its work" — that the six
rule-based engines in `lib/` already make.

The tools match the author's course (365 Careers, *The AI Engineer Course*):
Python, LangChain, OpenAI, Pinecone.

## 2. Goals, non-goals, anti-goals

**Goals**
- One clean, well-explained RAG pipeline: index → retrieve → generate with citations.
- An eval suite that answers "how do you know it works?" with numbers.
- Strict per-user data isolation in the vector store.
- Fits into the existing app with one button and one API route.

**Non-goals (v1)**
- Agents, tool use, multi-step planning, fine-tuning.
- Chat / multi-turn conversation history.
- Streaming responses.
- Replacing any existing rule-based engine (`lib/career-fit.ts`,
  `lib/interview-reflection.ts`, etc.). They stay as they are.
- Semantic job fit (embedding-based skill matching). Planned as a follow-up that
  reuses the same index; out of scope here.

**Anti-goals — the feature fails if any of these happen, even if it "works"**
- An answer contains a claim with no citation, or cites a source that wasn't retrieved.
- One user's notes or job descriptions ever appear in another user's answer.
- Saving a job or note fails, or becomes noticeably slow, because the AI service is down.
- The code becomes too clever to explain in an interview (no hidden magic layers).

## 3. Constraints

- Existing app: Next.js 15.4.11 (Pages Router API routes in `pages/api/**`,
  App Router UI in `src/app/**`), MongoDB via Mongoose, Clerk auth, Upstash rate
  limiting (`lib/rate-limit.ts`), deployed on Vercel.
- Auth today: `withAuth` in `lib/api-helpers.ts` derives `userId` from Clerk.
  Every Mongo document carries `userId`.
- Source data:
  - `models/Job.ts` — `title`, `company`, `jobDescription` (optional), `stage`.
  - `models/Note.ts` — `title`, `content`, `round` (optional), `jobId` (optional).
  - `models/CareerProfile.ts` — `skills[]`, `targetRole`, `seniority`.
- Stack for the AI service (decided): **Python, FastAPI, LangChain, OpenAI
  (embeddings + chat), Pinecone**.
- The author must be able to explain every component; prefer plain, readable
  code over abstraction.

## 4. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Separate Python FastAPI service in `ai-service/` in this repo, deployed separately (Render/Railway). Next.js calls it via one API route. | Matches the course line-for-line; clean "web app + AI service" architecture story. Cost: two deploys to run. |
| B | All TypeScript in Next.js with LangChain.js | One deploy, but not the Python the author learned — APIs differ, harder to explain. |
| C | Python as Vercel serverless functions | One deploy, but LangChain bundle size limits and cold starts fight the platform. |

The author picked **A**.

## 5. Decided design

### 5.1 Architecture

```
Browser ──► Next.js (Vercel)                       Python ai-service (Render)
            pages/api/ai/prep.ts  ── POST /prep ──► FastAPI
            (Clerk auth, rate limit)                 │  LangChain retrieval
            pages/api/notes, jobs ── POST /index ──►│  OpenAI embeddings + chat
                                  ── DELETE /index ─►│  Pinecone (namespace = userId)
```

- **Trust boundary:** the Python service does **not** talk to Clerk. Only the
  Next.js API calls it, authenticated with a shared secret header
  (`X-AI-Service-Key`, env `AI_SERVICE_SECRET`). Next.js passes the `userId`
  it got from `withAuth`; the Python service never accepts a `userId` from
  the browser.
- The Python service does not need MongoDB access at request time: Next.js
  pushes the text to index. (The backfill script is the only Python code that
  reads Mongo.)

### 5.2 Indexing

- **What gets indexed:** job descriptions (`Job.jobDescription`, prefixed with
  title + company), the job's free-text notes field (`Job.notes`, sourceType
  `job_notes`, cited as a link to the job page), and Note documents
  (`Note.title` + `Note.content`). The career profile is small, so it is
  **not** embedded; it is passed straight into the prompt.
- **Notes with no job:** Pinecone metadata can't hold null, so notes with
  `jobId: null` are stored with `jobId: "none"`. They are included in the
  cross-job retrieval pass (they're often exactly the weak-spot material).
- **Chunking:** LangChain `RecursiveCharacterTextSplitter`, ~800 characters,
  ~100 overlap.
- **Embeddings:** OpenAI `text-embedding-3-small`.
- **Pinecone layout:** one index, one shared namespace, and **every vector
  carries `userId` metadata**. Isolation is enforced at a single choke point:
  all reads, writes and deletes go through one function that takes `user_id`
  and always adds the `userId` filter. No code path queries Pinecone without
  it, and pytest asserts this. (Namespace-per-user was considered, but
  Pinecone's free Starter plan caps namespaces per index, around 100, which a
  public portfolio app could hit.) Evals use a separate index-level namespace
  `eval`.
- **Vector ID:** `{sourceType}:{sourceId}:{chunkIndex}` so all chunks of a
  source can be deleted/replaced together.
- **Metadata per chunk:** `sourceType` (`job_description` | `note`),
  `sourceId`, `jobId`, `company`, `title`, `round`, `createdAt`, `text`.
- **Keeping in sync:** after a successful Mongo write in
  `pages/api/notes/*` and `pages/api/jobs/*`, Next.js calls the AI service:
  create/update → `POST /index` (replace all chunks for that source);
  delete → `DELETE /index`. These calls are **fire-and-forget with a short
  timeout** — failures are logged, never surfaced to the user, and never block
  the save (anti-goal).
- **Lifecycle rules:**
  - Job edited → re-index its JD and `Job.notes`, and re-index its Note
    documents so their `company`/`title` metadata stays current.
  - Job deleted → delete its JD and `Job.notes` chunks. Its Note documents
    still exist in Mongo (the app doesn't cascade), so they stay indexed as
    history.
  - Account deleted → extend `pages/api/clerk/webhook.ts` to handle
    `user.deleted` by deleting all of that user's vectors.
  - Stale citations: before returning, `pages/api/ai/prep.ts` checks that
    each cited source still exists in Mongo for this user and drops items
    whose only citations are gone. So a failed delete sync can never produce
    a broken citation link.
- **Backfill / repair:** `ai-service/scripts/reindex.py` reads all jobs and
  notes from MongoDB and re-indexes them. Safe to run any time; it heals any
  drift from failed sync calls.

### 5.3 Retrieval and generation (`POST /prep`)

Input from Next.js: `userId`, `jobId`, job title/company, an optional free-text
`focus` from the user (e.g. "system design round"), and the career profile.

1. Build a query from job title + company + focus.
2. **Retrieve, two passes, both inside the user's namespace:**
   - this job: filter `jobId == <jobId>` (its JD + notes), top ~6
   - other jobs: filter `jobId != <jobId>`, sourceType `note`, top ~6
     (this is what finds "you struggled with caching at Company A too")
3. Label each retrieved chunk `[S1]…[Sn]` in the prompt.
4. Call the OpenAI chat model through LangChain with **structured output**
   (Pydantic schema):
   - `likelyQuestions: [{question, why, citations: [S#]}]`
   - `weakSpots: [{topic, detail, citations: [S#]}]`
   - `studyPlan: [{item, citations: [S#]}]`
   - `insufficientData: bool`
5. **Citation guard (code, not prompt):** drop any item with zero citations or
   with a citation that isn't in the retrieved set. Map `S#` back to
   `{sourceType, sourceId, title}` for the response.
6. If nothing relevant is retrieved, return `insufficientData: true` with a
   plain message ("Add notes from your rounds to get prep tailored to you")
   instead of generic advice.

The chat model name comes from env (`OPENAI_CHAT_MODEL`), default a current
cost-efficient OpenAI model.

### 5.4 Next.js integration

- New route `pages/api/ai/prep.ts`: `withAuth`, `enforceRateLimit` with a new
  stricter **`ai` tier** in `lib/rate-limit.ts` (e.g. 10 requests/min), loads
  the job (checking it belongs to `userId`) and the career profile from Mongo,
  calls the AI service, returns its JSON.
- New `lib/ai-client.ts`: small typed wrapper for the three AI-service calls
  (`prep`, `indexSource`, `deleteSource`), with timeouts.
- UI: a **"Prep for this interview"** panel on `src/app/dashboard/jobs/[id]`
  with an optional focus input, loading state, and the three sections. Each
  citation is a chip that links to the cited note (`/dashboard/notes/[id]`) or
  scrolls to the job description. Follows the existing Stitch design system.
- **Free hosting assumptions:** the design assumes free tiers (Render free,
  Vercel Hobby). Render sleeps when idle, so the panel sends a warm-up
  `GET /health` when the job page opens, and the UI has a distinct "waking up
  the AI service…" state. `pages/api/ai/prep.ts` sets `maxDuration` to the
  highest value the Vercel plan allows. The request stays synchronous (no
  job queue) for v1; target latency is under 15s once warm.
- `/demo` page (no signed-in user): shows a pre-generated sample result from
  the demo dataset, clearly labelled as a sample, so interviewers can see the
  feature without signing up.
- If `AI_SERVICE_URL` is not configured, the panel is hidden and sync calls are
  no-ops — same safe-by-default pattern as `lib/rate-limit.ts`.

### 5.4a Access, cost cap, and consent (decided by the author)

- **Available to all users (Free and Pro), capped at 5 prep requests per user
  per day.** The cap is enforced server-side in `pages/api/ai/prep.ts` with a
  small Mongo counter (new model `AiUsage`: `userId`, `date` (UTC day),
  `count`), not with Upstash. Upstash rate limiting is a no-op when it isn't
  configured, and a spend cap must always hold. When the cap is reached, the
  route returns 429, and the panel shows "You've used today's 5 preps,
  resets tomorrow" with the remaining count visible beforehand. The
  per-minute `ai` burst tier still applies on top.
- **Opt-in before any data leaves the app.** Nothing is sent to OpenAI until
  the user turns the copilot on. `CareerProfile` gains `aiEnabled: boolean`
  (default `false`) and `aiEnabledAt: Date`.
  - The panel first shows an enable card with a one-line notice: "Your job
    descriptions and interview notes will be sent to OpenAI to build your
    prep. You can turn this off any time."
  - Enabling it → Next.js pushes all of that user's jobs and notes to the
    AI service (batched `POST /index`).
  - The sync hooks in the jobs/notes routes and the reindex script **skip
    users with `aiEnabled: false`**.
  - Turning it off (in Settings) → deletes all of the user's vectors and
    sets `aiEnabled: false`.

### 5.5 Evals (`ai-service/evals/`)

- **Fixture dataset:** a synthetic user with ~8 jobs and ~25 notes, written so
  weak spots recur across companies. Indexed into a dedicated eval namespace.
- **~20 hand-labelled test cases:** query + jobId + the source IDs a correct
  answer should draw on, plus a few cases with no relevant notes (must return
  `insufficientData`).
- **Metrics, printed as a table by `python -m evals.run`:**
  - **Retrieval hit rate / recall@k** — did the expected sources come back?
  - **Citation validity** — % of cited IDs that were actually retrieved
    (should be 100% because of the guard; measured anyway).
  - **Groundedness** — LLM-as-judge: is each item supported by the text it
    cites? Scored per item.
  - **Insufficient-data accuracy** — did empty cases correctly decline?
- Results are saved to `evals/results/` so changes (chunk size, k, prompt) can
  be compared before/after — a concrete "I tuned it and here's what changed"
  interview story.

### 5.6 Testing

- **pytest:** chunking + vector ID scheme, citation guard (drops uncited and
  invented citations), namespace always equals the passed `userId`, secret
  header required. OpenAI and Pinecone are mocked in unit tests.
- **Vitest:** `pages/api/ai/prep.ts` rejects unauthenticated requests, rejects
  a `jobId` owned by another user, and handles an AI-service failure cleanly;
  the notes/jobs routes still succeed when the AI service is down; the 6th
  prep request of the day returns 429; no index call is made for a user
  with `aiEnabled: false`.

### 5.7 Configuration

- Next.js: `AI_SERVICE_URL`, `AI_SERVICE_SECRET`.
- ai-service: `AI_SERVICE_SECRET`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`,
  `PINECONE_API_KEY`, `PINECONE_INDEX`; `MONGODB_URI` for the reindex script only.
- Document setup in `docs/PRODUCTION_SETUP.md` and a short `ai-service/README.md`
  written so the author can use it as interview talking points (architecture
  diagram, why each choice, eval results).

## 6. Calls made by Claude (not explicitly decided by the author)

- Shared Pinecone namespace with a **mandatory `userId` filter at one choke
  point**, because of the free plan's namespace cap.
- `Job.notes` indexed; job-less notes stored as `jobId: "none"` and included.
- Lifecycle rules for job edit/delete, account deletion, and stale citations.
- Free hosting tiers with a warm-up ping and synchronous requests.
- `/demo` shows a labelled pre-generated sample.
- Daily cap enforced with a Mongo counter (`AiUsage`) rather than Upstash.
- Consent stored on `CareerProfile` (`aiEnabled`); turning it off deletes vectors.
- Next.js **pushes** text to index; the Python service has no Mongo access at runtime.
- Career profile goes into the prompt directly, not into the vector store.
- Sync calls are fire-and-forget; a reindex script repairs drift.
- Citation guard is enforced in code, not trusted to the prompt.
- New stricter `ai` rate-limit tier.
- Custom, small eval harness rather than a framework (e.g. RAGAS), so every
  metric is easy to explain.

## 7. Left to the builder

- Exact chunk size, overlap, and top-k values (tune with the eval suite).
- Prompt wording.
- FastAPI project layout inside `ai-service/`, Python dependency management
  (`requirements.txt` vs `uv`/Poetry).
- Exact UI layout of the panel within the existing design system.
- Hosting provider for the Python service (Render or Railway).
