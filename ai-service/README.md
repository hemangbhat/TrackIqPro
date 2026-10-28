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

Needs Python 3.10 or newer (`.python-version` pins 3.10.11).

```bash
cd ai-service
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash (PowerShell: .venv\Scripts\Activate.ps1)
# source .venv/bin/activate     # macOS/Linux
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
| `OPENAI_CHAT_MODEL` | yes | Chat model name. Must support structured outputs (`json_schema`), e.g. `gpt-4o-mini` |
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
4. Add the environment variables above, plus `PYTHON_VERSION=3.10.11` so Render
   uses a supported Python.
5. In Next.js set `AI_SERVICE_URL` (the Render URL) and `AI_SERVICE_SECRET`.

Unsetting `AI_SERVICE_URL` in Next.js only hides the feature and stops sync. It
does not delete anything already stored in Pinecone; users who want their data
gone should turn AI prep off in Settings first (that deletes their vectors), or
you can delete the index.

The free tier sleeps when idle. The web app sends a `GET /health` when a job page
opens to wake it up.

## Reindexing

Backfills existing data and repairs drift from sync calls that failed (for
example while the free-tier service was asleep). For each opted-in user it
deletes **all** of their vectors, then re-indexes every job and note from
MongoDB. So afterwards the index matches Mongo exactly: edits are refreshed, and
vectors of deleted notes/jobs or cleared fields are gone. Safe to run any time;
while a user is being rebuilt their prep may briefly see fewer sources. Running it
periodically (for example a daily cron) repairs any sync that still failed.

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
labels back to real source ids. The "no LLM call" path only applies when retrieval
finds nothing, which in practice means the user has no indexed data. Otherwise the
model decides what the retrieved text supports (the prompt asks it to flag
`insufficientData` rather than give generic advice), and the guard enforces that
every returned item is cited; if the guard drops every item, the answer becomes
`insufficientData`.

**Push-based sync.** Next.js sends text to the service after a successful save, as
fire-and-forget calls. Saving a job or note never waits on, or fails because of, the
AI service. The service needs no database access at runtime, and the reindex script
(delete all, then rebuild from Mongo) heals any missed call, including missed deletes.

**Opt-in consent.** Nothing leaves the app for OpenAI until the user turns the
copilot on (`CareerProfile.aiEnabled`). Sync and reindex skip everyone else, and
turning it off deletes the user's vectors.

**Daily cap.** 5 prep requests per user per UTC day, counted in Mongo (`AiUsage`),
not Upstash, because Upstash limiting is a no-op when unconfigured and a spend cap
must always hold.

**Plain code.** No agent frameworks and no chains that hide the Pinecone filter, so
every step can be explained line by line.

## Eval results

A small custom harness (no eval framework) answers "how do you know the RAG works?".
It indexes a fixed fixture user (8 jobs, 25 notes, `evals/fixtures/user.json`) into the
Pinecone namespace `eval`, runs 20 labelled cases (`evals/fixtures/cases.json`) through
the real retrieve + prep pipeline, and writes `evals/results/<UTC timestamp>.json`
with the settings used (k, chunk size/overlap, chat model).

Run it from `ai-service/` with `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`,
`AI_SERVICE_SECRET` and `OPENAI_CHAT_MODEL` set:

    python -m evals.run              # re-index fixtures, then run all cases
    python -m evals.run --no-index   # reuse vectors already in the eval namespace

Metrics:

- **recall@k**: share of the sources a human marked as relevant that retrieval returned.
- **hit rate**: share of cases where retrieval returned at least one relevant source.
- **citation validity**: share of output citations that point at a source retrieval returned (the guard should make this 100%).
- **groundedness**: share of output items an LLM judge says are supported by the text they cite.
- **insufficient correct**: share of cases where the service said "not enough data" exactly when expected. Notes from other jobs are always retrieved, so this measures whether the model declines when the retrieved notes do not support prep.

No results recorded yet — run `python -m evals.run` with API keys set.
