# Backend + AI Learning Path — using TrackIQ as the textbook

**Goal:** understand every backend and AI concept in TrackIQ well enough to
explain any file in an interview — and then build the next project yourself.

**Scope:** backend (Node/TypeScript, Next.js API, MongoDB, auth, payments,
background jobs, testing, deployment) and AI engineering (Python, NLP, LLMs,
embeddings, RAG, LangChain, evals). React only where it fetches data.
No CSS/HTML.

**Pace:** ~1.5–2 hours a day. Backend track ≈ 5–6 weeks, AI track ≈ 5–6 weeks.
Go slower if needed — understanding beats speed.

---

## How to study (read this first)

Every module has the same five parts:

1. **Why it matters** — what problem this concept solves.
2. **Learn** — the concepts to understand (look them up, ask me to explain).
3. **Read in TrackIQ** — the real files, in order.
4. **Build it yourself** — exercises. **You type the code.** No copy-paste.
5. **Check yourself** — interview-style questions. Answer out loud, without
   looking. If you can't, re-read.

### Rules for using AI while learning
- **Ask AI to explain, never to write.** "Explain line 42 of `lib/db.ts`" ✅.
  "Write the stats endpoint" ❌.
- **Write first, then ask for review.** Paste *your* attempt and ask "what's
  wrong and why?"
- **Predict before you run.** Before running a test or request, write down
  what you expect. Being wrong is where learning happens.
- **Break things on purpose.** Delete a line, run the tests, read the error.
- **Keep a learning log** (`notes.md`, outside the repo): for each module,
  3 sentences in your own words + one thing that confused you.
- **Use git branches** for exercises: `git checkout -b learn/module-3`.
  If it goes wrong, throw the branch away.

### Setup (Module 0 — do once)
- [ ] Clone the repo, `npm install`, copy `.env.example` → `.env.local` and
      fill in your keys.
- [ ] `npm run dev` → open http://localhost:3000, sign up, add a job.
- [ ] `npm test` → all tests pass. Then `npx vitest run lib/csv.test.ts` to
      run one file.
- [ ] Install a REST client (Thunder Client in VS Code, or Postman) — you'll
      call your API directly.
- [ ] Learn 5 git commands: `status`, `add`, `commit`, `checkout -b`, `log`.

---

# PART A — BACKEND TRACK

## Module 1 · TypeScript essentials (as used in this repo) — ~4 days

**Why:** every backend file is TypeScript. You can't read the rest without this.

**Learn:**
- Variables, functions, arrow functions, objects, arrays
- Array methods: `map`, `filter`, `reduce`, `sort`, `find`
- Destructuring: `const { userId } = req`
- Types: `type`, `interface`, union types (`"free" | "pro"`), optional `?`
- Modules: `import` / `export`
- **Async:** Promises, `async`/`await`, `try`/`catch` ← most important

**Read in TrackIQ (in order):**
1. `lib/plans.ts` — types, a union type, a pure function, a `switch`
2. `lib/csv.ts` — string handling, regex, small functions
3. `lib/job-filter.ts` — `filter` / `sort` on arrays of jobs
4. `lib/insights.ts` — `reduce`, dates, computed stats
5. `types/index.ts` — the shared data types

**Build it yourself:**
- [ ] In a scratch file, write `countByStage(jobs)` that returns
      `{ applied: 3, interview: 1, ... }` using `reduce`. Test it with
      `console.log`.
- [ ] Write `daysSince(date)` without looking at the repo's version, then
      compare with `lib/insights.ts`.
- [ ] Write an `async` function that waits 1 second (`setTimeout` in a
      Promise) and logs — then explain what `await` actually waits for.

**Check yourself:**
- What's the difference between `type` and `interface`?
- What does `await` do, and what happens if you forget it on a DB call?
- Why is `lib/plans.ts` split from `lib/stripe.ts`?

---

## Module 2 · HTTP & REST APIs — ~3 days

**Why:** the backend *is* an HTTP API. Every interview asks about this.

**Learn:**
- Request: method (GET/POST/PUT/PATCH/DELETE), URL, path params, query
  params, headers, body (JSON)
- Response: status codes — 200, 201, 400, 401, 403, 404, 405, 429, 500
- REST resource design: `/api/jobs` vs `/api/jobs/[id]`
- Idempotency: why GET/PUT/DELETE should be safe to repeat

**Read in TrackIQ:**
1. `lib/api-helpers.ts` — `errorResponse`, `successResponse`, `methodNotAllowed`
2. `pages/api/jobs/index.ts` — GET list, POST create
3. `pages/api/jobs/[id].ts` — GET one, PUT update, DELETE
4. `pages/api/health.ts` — the simplest route

**Build it yourself:**
- [ ] With your REST client, call `GET /api/health`. Then call
      `GET /api/jobs` while signed out — what status? Why?
- [ ] Call `DELETE /api/health`. What do you get and which line causes it?
- [ ] **Build `GET /api/jobs/stats`** that returns
      `{ total, byStage: {...} }` for the signed-in user. Use `withAuth`.
      (You'll make it faster with a DB aggregation in Module 4.)

**Check yourself:**
- 401 vs 403 — give an example of each from this app.
- Why does `/api/jobs/[id]` return 404 (not 403) for someone else's job?
- What status should a validation error return, and why not 500?

---

## Module 3 · Next.js as a backend — ~3 days

**Why:** Next.js runs your API. You need to know where code runs.

**Learn:**
- App Router (`src/app`) vs Pages Router (`pages/api`) — why this repo uses both
- Server vs client code; what ends up in the browser bundle
- Middleware: code that runs before every request
- Environment variables: `process.env`, why `NEXT_PUBLIC_` is special
- Serverless functions: each API route is a short-lived function (cold starts!)

**Read in TrackIQ:**
1. `middleware.ts` — public routes vs protected routes
2. `next.config.mjs`, `vercel.json`
3. `.env.example` — every variable and what uses it
4. `hooks/useJobs.ts` — how the React side calls the API (just the `fetch` parts)

**Build it yourself:**
- [ ] Add `/api/version` returning `{ version: "1.0.0" }`. Is it protected?
      Make it public in `middleware.ts` and confirm.
- [ ] Add `console.log` in `lib/db.ts` inside `connectDB`. Call an API twice.
      How many times does it log? Explain why (connection caching).
- [ ] Find one secret that must never get a `NEXT_PUBLIC_` prefix and explain why.

**Check yourself:**
- What is a cold start, and why does `lib/db.ts` cache the connection on `globalThis`?
- Why does the Stripe webhook route need `bodyParser: false`?

---

## Module 4 · MongoDB & Mongoose — ~5 days

**Why:** data modeling and queries are core backend interview material.

**Learn:**
- Documents, collections, `_id` / ObjectId
- Mongoose: schema, model, validation, `timestamps`
- CRUD: `find`, `findOne`, `create`, `findOneAndUpdate`, `deleteOne`, `countDocuments`
- Query filters, sort, `.lean()`, upsert
- **Indexes** — what they are, compound indexes, why `userId` comes first
- Aggregation pipeline: `$match`, `$group`, `$sort`
- When to choose MongoDB vs a SQL database (Postgres)

**Read in TrackIQ:**
1. `lib/db.ts` — connection + caching
2. `models/Job.ts` — schema, enums, indexes
3. `models/Note.ts`, `models/Offer.ts`, `models/UserPlan.ts`, `models/CareerProfile.ts`
4. `pages/api/career-profile.ts` — an upsert with input cleaning

**Build it yourself:**
- [ ] Rewrite your `/api/jobs/stats` with an aggregation
      (`$match: { userId }` → `$group` by stage). Compare speed in theory.
- [ ] **Fix a real limitation:** deleting a job leaves its notes behind.
      In `pages/api/jobs/[id].ts` DELETE, also delete notes with that `jobId`
      (same `userId`). Write down what could go wrong if one delete fails.
- [ ] Add a `lastContactAt` date field to `Job` (fixes another real
      limitation — see Module 9).
- [ ] Open MongoDB Atlas → your collection → look at real documents and indexes.

**Check yourself:**
- Why does every index in this repo start with `userId`?
- What does `.lean()` do and when shouldn't you use it?
- Name one thing Postgres would do better for this app.

---

## Module 5 · Auth, security & data isolation — ~4 days

**Why:** "how do you stop user A seeing user B's data?" is asked everywhere.

**Learn:**
- Authentication (who are you) vs authorization (what may you do)
- Sessions / JWT basics; what Clerk does for you
- **IDOR** (insecure direct object reference) — the #1 multi-user bug
- Input validation, mass assignment, rate limiting
- OWASP Top 10 (just skim the list)

**Read in TrackIQ:**
1. `lib/api-helpers.ts` → `withAuth`, `isObjectId`
2. `pages/api/jobs/[id].ts` → `EDITABLE_FIELDS` whitelist, `{ _id, userId }` queries
3. `lib/rate-limit.ts` — sliding window, tiers, fail-open
4. `components/data-isolation.property.test.tsx` — a test that proves isolation

**Build it yourself:**
- [ ] Remove `userId` from the `findOne` in `pages/api/jobs/[id].ts` (on a
      branch!). Explain exactly how an attacker would exploit it. Restore it.
- [ ] **Fix a real limitation:** when creating a note with a `jobId`, verify
      that job belongs to the user (`pages/api/notes/index.ts`). Return 404 if not.
- [ ] Remove `"userId"` handling from the update whitelist and explain the
      mass-assignment attack it prevents.

**Check yourself:**
- Walk through a request from browser to DB and name every security check.
- Why does rate limiting "fail open"? When would you fail closed instead?

---

## Module 6 · Testing — ~4 days

**Why:** tests prove your code works and let you change it safely.

**Learn:**
- Unit vs integration vs end-to-end tests
- Vitest: `describe`, `it`, `expect`, mocks (`vi.mock`, `vi.fn`)
- Property-based testing (fast-check): test *rules* over random inputs
- What CI is and why tests run on every push

**Read in TrackIQ:**
1. `lib/csv.test.ts` — simplest tests
2. `lib/billing-status.test.ts` — testing every branch of a function
3. `lib/scoring.property.test.ts` — property tests
4. `components/OfferMatrix.test.tsx` — mocking hooks and side effects
5. `.github/workflows/ci.yml`

**Build it yourself:**
- [ ] Write tests for your `countByStage` and `/api/jobs/stats` logic
      (extract the logic into a pure function in `lib/` first — that's the pattern).
- [ ] Write one property test: "for any list of jobs, the counts in
      `byStage` sum to `total`".
- [ ] Break `planFromSubscriptionStatus` on purpose; watch which test fails.

**Check yourself:**
- Why are the scoring engines pure functions? How does that help testing?
- Give one bug a property test would catch that an example test might miss.

---

## Module 7 · Payments & webhooks (Stripe) — ~4 days

**Why:** webhooks, signatures and idempotency are classic system-design topics.

**Learn:**
- Stripe Checkout flow; subscriptions and statuses
- **Webhooks:** the provider calls *your* server when something happens
- Signature verification on the raw body; why
- Idempotency and out-of-order events
- "Never trust the client" for payments

**Read in TrackIQ:**
1. `pages/api/stripe/checkout.ts` — why it does *not* upgrade the user
2. `pages/api/stripe/webhook.ts` — signature check, event types
3. `lib/plans.ts` → `planFromSubscriptionStatus` (fail-closed design)
4. `pages/api/stripe/portal.ts`, `pages/api/jobs/index.ts` (free-tier limit)

**Build it yourself:**
- [ ] Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`,
      buy Pro with test card `4242 4242 4242 4242`, watch the events arrive.
- [ ] Send a webhook with a wrong signature (edit one character) — what happens?
- [ ] **Fix a real limitation:** ignore out-of-order events. Store the
      latest `event.created` on `UserPlan` and skip older events. Add a test.

**Check yourself:**
- Why is upgrading the user at checkout creation a security bug?
- What happens if Stripe sends the same webhook twice?

---

## Module 8 · Background jobs, caching & integrations — ~3 days

**Why:** real backends do work outside of user requests.

**Learn:**
- Cron jobs / scheduled tasks; serverless limits
- Redis basics: key-value, TTL, `SET NX EX` for "do once"
- Transactional email; third-party API failures
- Fail-open vs fail-closed design

**Read in TrackIQ:**
1. `vercel.json` — the schedule
2. `pages/api/cron/follow-up-reminders.ts` — auth, grouping, dedupe
3. `lib/email.ts`, `lib/email-templates.ts`
4. `pages/api/clerk/webhook.ts` — another webhook (Svix)

**Build it yourself:**
- [ ] Call the cron route locally with and without the `Authorization:
      Bearer` header. Explain each result.
- [ ] Explain line by line what `SET reminded:<userId> NX EX 72000` guarantees.
- [ ] Design (on paper) how you'd change the cron to a queue for 1M users.

**Check yourself:**
- Why can't you rate-limit with an in-memory counter on serverless?
- What happens if the email provider is down during the cron?

---

## Module 9 · Algorithms in the engines — ~4 days

**Why:** these are the most *original* part of your project — expect deep questions.

**Learn:**
- Weighted scoring, normalizing weights to sum to 1
- Min-max normalization and the divide-by-zero edge case
- Ranking, tie-breaking, complexity (Big-O)
- Explainability: returning reasons with results

**Read in TrackIQ (in order):**
1. `lib/scoring.ts` — the simplest engine
2. `lib/offer-intelligence.ts` — 6 dimensions + what-if
3. `lib/skills.ts` + `lib/career-fit.ts` — keyword extraction + point model
4. `lib/career-health.ts`, `lib/follow-up-intelligence.ts`
5. `lib/interview-reflection.ts` — rule-based text analysis

**Build it yourself:**
- [ ] By hand (paper!), score 2 offers with `lib/scoring.ts` rules. Then run
      the code and compare.
- [ ] Use your new `lastContactAt` field in `lib/follow-up-intelligence.ts`
      so editing a job no longer resets staleness. Update the tests.
- [ ] Add 5 skills to `lib/skills.ts` and write a test proving they're detected.

**Check yourself:**
- Why do offer scores change when you add a new offer?
- Explain the follow-up priority formula with numbers.

---

## Module 10 · Deployment & operations — ~2 days

**Learn:** environment variables in production, CI/CD, Vercel, secrets
management, logs, health checks, rotating leaked credentials.

**Read in TrackIQ:** `docs/PRODUCTION_SETUP.md`, `.github/workflows/ci.yml`,
`pages/api/health.ts`.

**Build it yourself:**
- [ ] Deploy a change through a pull request: branch → push → CI → merge → Vercel.
- [ ] Read your Vercel function logs for one request.

**Backend milestone ✅** — you can now: build a REST API with auth, a
database, payments, background jobs, tests, and deploy it. **Prove it:**
build a tiny new app from scratch (e.g. a "bookmarks API" with auth +
MongoDB + tests) *without AI writing code*.

---

# PART B — AI ENGINEERING TRACK

Maps to your course (Python, NLP, transformers/LLMs, LLM APIs, LangChain,
Hugging Face, vector databases). Everything you build here becomes the
**TrackIQ AI service** — a Python service your Next.js app calls. That's your
AI-engineer portfolio centerpiece.

```
Next.js app (TrackIQ)  ──HTTP──►  Python AI service (FastAPI)
                                   ├─ embeddings + vector DB
                                   ├─ RAG over your notes + job descriptions
                                   ├─ LLM calls (LangChain)
                                   └─ evals
```

## Module 11 · Python for AI engineers — ~5 days
- **Learn:** syntax, functions, lists/dicts, classes, virtualenvs, `pip`,
  type hints, `async`, reading JSON.
- **Bridge from TypeScript:** rewrite `lib/scoring.ts` in Python (`scoring.py`)
  with `pytest` tests that match the TypeScript tests' cases.
- **Build:** a FastAPI service with `GET /health` and `POST /score` that
  returns the same scores as the TypeScript engine.
- **Check:** how does a FastAPI route compare to `pages/api/jobs/index.ts`?

## Module 12 · NLP fundamentals — ~4 days
- **Learn:** tokenization, normalization, stop words, n-grams, TF-IDF,
  named-entity recognition.
- **In TrackIQ:** `lib/skills.ts` is keyword-based NLP. What are its limits?
  (synonyms, misspellings, "React Native" vs "React").
- **Build:** in Python, extract skills from job descriptions using TF-IDF +
  the lexicon. Compare results with the TypeScript version on the demo data
  in `lib/demo-data.ts`.

## Module 13 · LLM APIs & prompting — ~4 days
- **Learn:** tokens, context window, temperature, system prompts,
  **structured output (JSON)**, cost and latency, failure handling.
- **Build:** `POST /extract-skills` — send a job description to an LLM and
  get back validated JSON `{ skills: [...], seniority: "..." }`. Validate it
  with Pydantic. Handle bad JSON and timeouts.
- **Check:** why validate LLM output? What do you do when it's wrong?

## Module 14 · Embeddings & vector databases — ~5 days
- **Learn:** what an embedding is, cosine similarity, vector databases
  (Pinecone or MongoDB Atlas Vector Search — you already use Atlas),
  chunking, metadata filtering (**filter by `userId`!** — same isolation rule
  as Module 5).
- **Build:** semantic Job Fit — embed your skills profile and each job
  description; score similarity. Compare with the keyword engine: where does
  each win?
- **Check:** why must every vector query filter by user?

## Module 15 · RAG (retrieval-augmented generation) — ~5 days
- **Learn:** retrieve → augment prompt → generate; citations; chunk size;
  hallucination.
- **Build:** **"Interview prep coach"** — ask "what should I revise before my
  Linear interview?" → retrieve your interview notes + that job's description →
  LLM answers **with citations to the notes it used**. (Same "show your work"
  principle as the engines.)
- **Check:** how do you stop the model inventing facts not in the notes?

## Module 16 · LangChain & agents — ~4 days
- **Learn:** chains, retrievers, tools/function calling, memory, when *not*
  to use a framework.
- **Build:** refactor the RAG coach with LangChain. Then a small agent with
  2 tools: `get_priority_queue(user)` and `search_notes(query)`.
- **Check:** what does LangChain give you vs plain API calls? What does it cost?

## Module 17 · Evals & production AI — ~4 days
- **Learn:** evaluation sets, metrics (precision/recall for extraction,
  groundedness for RAG), LLM-as-judge, logging prompts, cost tracking,
  caching, rate limits, privacy.
- **Build:** a 30-example eval set for skill extraction (from your demo
  data) and a script that scores your keyword engine vs embeddings vs LLM.
  Put the results table in your README — **this is what impresses AI-engineer
  interviewers most.**
- **Check:** how do you know your AI feature got better after a change?

## Module 18 · Capstone — connect it to TrackIQ — ~1 week
- [ ] Deploy the FastAPI service (Render / Railway / Fly.io).
- [ ] Next.js calls it from a new `pages/api/ai/*` route **with `withAuth`
      and rate limiting** (reuse Modules 5 & 8).
- [ ] Add a privacy note to `/privacy`: what's sent to the AI provider, opt-in.
- [ ] Update `docs/INTERVIEW_GUIDE.md` with the AI architecture and eval results.

**AI milestone ✅** — you can explain and build: LLM calls with structured
output, embeddings + vector search, RAG with citations, an agent with tools,
and an eval that proves quality.

---

## Progress tracker

| # | Module | Started | Done | Can explain without notes? |
|---|--------|---------|------|----------------------------|
| 0 | Setup | | | |
| 1 | TypeScript essentials | | | |
| 2 | HTTP & REST | | | |
| 3 | Next.js backend | | | |
| 4 | MongoDB & Mongoose | | | |
| 5 | Auth & security | | | |
| 6 | Testing | | | |
| 7 | Stripe & webhooks | | | |
| 8 | Background jobs | | | |
| 9 | Engines / algorithms | | | |
| 10 | Deployment | | | |
| 11 | Python | | | |
| 12 | NLP | | | |
| 13 | LLM APIs | | | |
| 14 | Embeddings & vectors | | | |
| 15 | RAG | | | |
| 16 | LangChain & agents | | | |
| 17 | Evals | | | |
| 18 | Capstone | | | |
