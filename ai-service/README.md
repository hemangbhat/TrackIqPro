# TrackIQ AI service

A small FastAPI service that powers the **Interview Prep Copilot**: given a job, it
reads the user's job description and interview notes and returns likely questions,
recurring weak spots and a short study plan. **Every item cites its sources.**

## What it does

1. **Index**: the Next.js app pushes job descriptions and notes here. They are
   split into chunks, embedded with OpenAI and stored in Pinecone.
2. **Prep**: for one job, it retrieves the most relevant chunks (this job, plus
   notes from other jobs), asks an OpenAI chat model for a structured answer, and
   then checks the citations in code before returning anything.

Routes (all but `/health` need the `X-AI-Service-Key` header):

| Route | Purpose |
|---|---|
| `GET /health` | Warm-up / liveness |
| `POST /index` | Replace all chunks for the given sources |
| `POST /index/delete` | Delete the chunks of given sources |
| `DELETE /users/{userId}` | Delete everything for a user |
| `POST /prep` | Generate cited interview prep |

## Architecture

```
Browser ──► Next.js (Vercel)                         Python ai-service (Render)
            pages/api/ai/prep.ts  ── POST /prep ───► FastAPI
            (Clerk auth, rate limit, daily cap)       │  retrieval + citation guard
            pages/api/notes, jobs ── POST /index ───►│  OpenAI embeddings + chat
                                  ── delete calls ───►│  Pinecone: ONE shared namespace,
                                                      │  mandatory userId filter on every call
```

- The service never talks to Clerk and never accepts a `userId` from a browser.
  Only the Next.js API calls it, with a shared secret header.
- It does not read MongoDB at request time. Next.js pushes the text. Only the
  reindex script reads Mongo.

## Run locally

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/activate          # Windows; use source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
# create a .env file with the variables below
uvicorn app.main:app --reload
python -m pytest                # tests mock OpenAI and Pinecone, no keys needed
```

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `AI_SERVICE_SECRET` | yes | Must match the Next.js `AI_SERVICE_SECRET` |
| `OPENAI_API_KEY` | yes | Embeddings and chat |
| `OPENAI_CHAT_MODEL` | yes | Chat model name |
| `PINECONE_API_KEY` | yes | |
| `PINECONE_INDEX` | yes | Name of the index below |
| `PINECONE_NAMESPACE` | no | Defaults to the empty (default) namespace. Evals use `eval` |
| `MONGODB_URI` | reindex only | Include the database name in the URI |

## Pinecone index setup

Create one index in the Pinecone console:

- Dimension: **1536** (OpenAI `text-embedding-3-small`)
- Metric: **cosine**
- Type: **serverless**

## Deploy on Render

1. New Web Service from this repo, root directory `ai-service`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the environment variables above.
5. In Next.js set `AI_SERVICE_URL` (the Render URL) and `AI_SERVICE_SECRET`.

The free tier sleeps when idle. The web app sends a `GET /health` when a job page
opens to wake it up.

## Reindexing

Repairs drift from failed sync calls, or backfills existing data. Safe to run any
time because upserting a source replaces all of its chunks.

```bash
python -m scripts.reindex                 # every user with aiEnabled: true
python -m scripts.reindex --user user_123 # one user
```

Users who have not opted in (`CareerProfile.aiEnabled`) are skipped. The script
prints only counts (user id, sources, chunks), never note content.

## Why each choice

**One shared namespace, one choke point.** Namespace-per-user hits Pinecone's free
plan namespace cap. Instead every vector carries `userId` metadata, and all reads,
writes and deletes go through one class, `UserStore` in `app/store.py`. It takes the
`user_id` once and always adds the filter, so no code path can query without it.
Vector IDs are `{userId}#{sourceType}#{sourceId}#{chunkIndex}`, so a source or a
whole user can be deleted by prefix. That only works if user ids never contain `#`,
so the store rejects ids that do. Tests assert the filter and prefix on every call.

**Citation guard in code, not in the prompt.** Prompts are requests; code is a
guarantee. Retrieved chunks are labelled `[S1]..[Sn]`; the model must cite those
labels. Before returning, code normalises label variants (for example `s1`, `[S1]`),
drops any item with no citation or a citation that was not retrieved, and maps
labels back to real source ids. If nothing relevant was retrieved the service says
so (`insufficientData`) instead of giving generic advice.

**Push-based sync.** Next.js sends text to the service after a successful save, as
fire-and-forget calls. Saving a job or note never waits on, or fails because of, the
AI service. The service needs no database access at runtime, and the reindex script
heals any missed call.

**Opt-in consent.** Nothing leaves the app for OpenAI until the user turns the
copilot on (`CareerProfile.aiEnabled`). Sync and reindex skip everyone else, and
turning it off deletes the user's vectors.

**Daily cap.** 5 prep requests per user per UTC day, counted in Mongo (`AiUsage`),
not Upstash, because Upstash limiting is a no-op when unconfigured and a spend cap
must always hold.

**Plain code.** No agent frameworks and no chains that hide the Pinecone filter, so
every step can be explained line by line.

## Eval results

To be filled by the eval run.
