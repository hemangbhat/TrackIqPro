# Interview Prep Copilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cited, retrieval-grounded "Prep for this interview" copilot to TrackIQ, built as a separate Python AI service with an eval suite.

**Architecture:** A FastAPI service in `ai-service/` owns embeddings, Pinecone, and generation (LangChain + OpenAI). The Next.js app stays the only caller: it authenticates users with Clerk, enforces opt-in and the daily cap, pushes job/note text to the service for indexing, and renders results. Every Pinecone call goes through one user-scoped store class, and every generated item must carry a citation that a code-level guard verifies.

**Tech Stack:** Python 3.10+, FastAPI, Uvicorn, LangChain (`langchain-openai`, `langchain-text-splitters`), `pinecone` client, Pydantic v2, pytest, httpx. Next.js 15.4.11 Pages Router API, Mongoose, Clerk, Vitest, `@vercel/functions` (`waitUntil`).

**Spec:** `docs/superpowers/specs/2026-10-27-interview-prep-copilot-design.md`

## Global Constraints

- The Python service never talks to Clerk and never accepts a `userId` from a browser; every request except `GET /health` must carry header `X-AI-Service-Key` equal to env `AI_SERVICE_SECRET`, else 401.
- No Pinecone read, write, or delete happens outside `ai-service/app/store.py::UserStore`; every query carries a `userId` filter and every vector ID starts with `{userId}#`.
- Embeddings: OpenAI `text-embedding-3-small` (1536 dims). Chat model from env `OPENAI_CHAT_MODEL`.
- Chunking: `RecursiveCharacterTextSplitter`, `chunk_size=800`, `chunk_overlap=100`.
- Source types are exactly `"job_description" | "job_notes" | "note"`. Notes with no job are stored with `jobId: "none"`.
- Daily cap: **5** prep requests per user per UTC day, enforced via the Mongo `AiUsage` model.
- Nothing is sent to the AI service for a user whose `CareerProfile.aiEnabled` is not `true`.
- Saving/deleting a job or note must never fail or wait on the AI service (sync runs via `waitUntil`, errors logged).
- If `AI_SERVICE_URL` is unset, the AI client is a no-op, sync does nothing, and the prep panel is hidden.
- Consent copy, exactly: "Your job descriptions and interview notes will be sent to OpenAI to build your prep. You can turn this off any time."
- Cap copy, exactly: "You've used today's 5 preps, resets tomorrow"
- Empty-data copy, exactly: "Add notes from your rounds to get prep tailored to you"
- Python dependencies pinned to exact versions in `ai-service/requirements.txt`.
- Code must stay readable enough for the author to explain line by line: no agent frameworks, no LangChain chains that hide the Pinecone filter.

## Review Focus

1. **A job with no description, no `Job.notes`, and no related notes** → `/prep` returns `insufficientData: true` with the empty-data copy and makes **no** chat-model call. Test: Task 4 `test_prep_with_no_matches_skips_llm`.
2. **A very long note (e.g. 60,000 chars)** → it is chunked and upserted in batches of at most 100 vectors, and re-saving it replaces all old chunks (no orphans when the new text has fewer chunks). Test: Task 3 `test_upsert_long_source_batches_and_replaces`.
3. **Two prep requests at the same moment when the user has used 4 of 5** → exactly one succeeds and one gets 429. Test: Task 7 `consumes at most 5 even when called concurrently`.
4. **AI service down or timing out during prep** → the route returns 503 with a friendly message and the day's usage is refunded. Test: Task 8 `refunds usage and returns 503 when the AI service fails`.
5. **A `jobId` belonging to another user** → 404, no usage consumed, no AI call. Test: Task 8 `returns 404 for another user's job without consuming usage`.

---

## File Structure

```
ai-service/
  requirements.txt            pinned deps (runtime + pytest/httpx)
  README.md                   setup + interview talking points
  app/
    __init__.py
    config.py                 Settings (env) via pydantic-settings
    main.py                   FastAPI app, auth dependency, routes
    schemas.py                request/response Pydantic models
    chunking.py               source -> chunks + vector ids + metadata
    store.py                  UserStore: the only Pinecone access
    prep.py                   retrieval, prompt, structured output, citation guard
  scripts/reindex.py          Mongo -> index backfill for opted-in users
  evals/
    fixtures/user.json        synthetic eval user (jobs + notes)
    fixtures/cases.json       ~20 labelled cases
    run.py                    python -m evals.run
    results/.gitkeep
  tests/                      pytest (OpenAI/Pinecone faked)

lib/ai-client.ts              typed HTTP client (no-op when unconfigured)
lib/ai-sources.ts             Job/Note -> IndexSource (pure)
lib/ai-sync.ts                opted-in, fire-and-forget sync helpers
lib/ai-usage.ts               atomic daily cap
lib/demo-prep-sample.ts       static PrepResult for /demo
models/AiUsage.ts             new
models/CareerProfile.ts       + aiEnabled, aiEnabledAt
lib/rate-limit.ts             + "ai" tier
pages/api/ai/prep.ts          new
pages/api/ai/status.ts        new
pages/api/ai/enable.ts        new
pages/api/jobs/index.ts, [id].ts, notes/index.ts, [id].ts   + sync calls
pages/api/clerk/webhook.ts    + user.deleted
components/PrepPanel.tsx      new
src/app/dashboard/jobs/[id]/page.tsx, settings/page.tsx, demo/page.tsx
```

---

### Task 1: AI service skeleton, config, and auth

**Files:**
- Create: `ai-service/requirements.txt`, `ai-service/app/__init__.py`, `ai-service/app/config.py`, `ai-service/app/main.py`, `ai-service/tests/conftest.py`, `ai-service/tests/test_auth.py`, `ai-service/pytest.ini`

**Interfaces:**
- Produces: `Settings` (fields `ai_service_secret: str`, `openai_api_key: str`, `openai_chat_model: str`, `pinecone_api_key: str`, `pinecone_index: str`, `pinecone_namespace: str = ""`, `mongodb_uri: str | None = None`); `get_settings() -> Settings` (cached); `require_service_key` FastAPI dependency; `app` with `GET /health -> {"status": "ok"}`.

- [ ] **Step 1: Write the failing tests** in `tests/test_auth.py` using `fastapi.testclient.TestClient` and env set in `conftest.py` (`AI_SERVICE_SECRET="test-secret"`, dummy keys):
  - `test_health_needs_no_key`: `GET /health` → 200, `{"status": "ok"}`
  - `test_protected_route_rejects_missing_key`: `POST /prep` with no header → 401
  - `test_protected_route_rejects_wrong_key`: header `X-AI-Service-Key: nope` → 401
- [ ] **Step 2: Run** `cd ai-service && python -m pytest tests/test_auth.py -v` → FAIL (import error)
- [ ] **Step 3: Implement** `config.py` (pydantic-settings, env names upper-case of fields) and `main.py` with `require_service_key` (compare with `hmac.compare_digest`) and a placeholder `POST /prep` guarded by it that returns 501 (replaced in Task 4).
- [ ] **Step 4: Run** the tests → PASS
- [ ] **Step 5: Commit** `feat(ai-service): FastAPI skeleton with service-key auth`

### Task 2: Chunking and vector IDs

**Files:**
- Create: `ai-service/app/schemas.py`, `ai-service/app/chunking.py`, `ai-service/tests/test_chunking.py`

**Interfaces:**
- Produces (`schemas.py`):
  - `SourceType = Literal["job_description", "job_notes", "note"]`
  - `IndexSource(BaseModel)`: `sourceType: SourceType`, `sourceId: str`, `jobId: str` (use `"none"` for no job), `company: str = ""`, `title: str`, `round: str = ""`, `createdAt: str` (ISO), `text: str`
  - `SourceRef(BaseModel)`: `sourceType: SourceType`, `sourceId: str`
- Produces (`chunking.py`):
  - `vector_id_prefix(user_id: str, source_type: str, source_id: str) -> str` → `f"{user_id}#{source_type}#{source_id}#"`
  - `chunk_source(user_id: str, source: IndexSource) -> list[Chunk]` where `Chunk` is a dataclass `id: str`, `text: str`, `metadata: dict`; id = prefix + chunk index; metadata = all `IndexSource` fields except `text`, plus `userId`, `chunkIndex`, and `text` (the chunk text).

- [ ] **Step 1: Write failing tests:**
  - `test_short_text_is_one_chunk`: 300-char text → 1 chunk, id `"u1#note#n1#0"`, `metadata["userId"] == "u1"`
  - `test_long_text_splits_with_800_limit`: 5,000-char text → every chunk `len(text) <= 800`, ids end `#0`, `#1`, … in order
  - `test_metadata_carries_job_none`: note with `jobId="none"` → `metadata["jobId"] == "none"`
  - `test_empty_text_yields_no_chunks`: `text="   "` → `[]`
- [ ] **Step 2: Run** `python -m pytest tests/test_chunking.py -v` → FAIL
- [ ] **Step 3: Implement** using `RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)`.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat(ai-service): source chunking with user-prefixed vector ids`

### Task 3: UserStore (the only Pinecone access) and index endpoints

**Files:**
- Create: `ai-service/app/store.py`, `ai-service/tests/fakes.py`, `ai-service/tests/test_store.py`, `ai-service/tests/test_index_routes.py`
- Modify: `ai-service/app/main.py`

**Interfaces:**
- Consumes: `chunk_source`, `vector_id_prefix`, `IndexSource`, `SourceRef` (Task 2).
- Produces:
  - `class UserStore:` `__init__(self, index, embeddings, user_id: str, namespace: str = "")` — raises `ValueError` if `user_id` is empty.
  - `upsert_sources(self, sources: list[IndexSource]) -> int` — for each source: delete existing vectors by prefix, then embed and upsert chunks in batches of **≤100**; returns chunk count.
  - `delete_sources(self, refs: list[SourceRef]) -> None` — list IDs by `vector_id_prefix` (`index.list(prefix=..., namespace=...)`), delete them.
  - `delete_all(self) -> None` — list by prefix `f"{user_id}#"`, delete.
  - `query(self, text: str, k: int, filter: dict) -> list[RetrievedChunk]` — always sends `{"$and": [{"userId": {"$eq": user_id}}, filter]}`; `RetrievedChunk` dataclass: `id`, `score`, `metadata`.
  - `get_store(user_id: str) -> UserStore` factory in `store.py` building the real Pinecone index + `OpenAIEmbeddings(model="text-embedding-3-small")`, overridable via FastAPI `dependency_overrides`.
  - Routes: `POST /index` body `{userId: str, sources: list[IndexSource]}` → `{"indexed": int}`; `POST /index/delete` body `{userId: str, sources: list[SourceRef]}` → `{"deleted": true}`; `DELETE /users/{userId}` → `{"deleted": true}`.
- `tests/fakes.py`: `FakeIndex` (in-memory upsert/list/delete/query recording calls; `query` returns stored vectors matching the userId filter) and `FakeEmbeddings` (deterministic vectors).

- [ ] **Step 1: Write failing tests** (`test_store.py`):
  - `test_query_always_includes_user_filter`: `store.query("x", 5, {"jobId": {"$eq": "j1"}})` → the recorded filter is `{"$and": [{"userId": {"$eq": "u1"}}, {"jobId": {"$eq": "j1"}}]}`
  - `test_user_cannot_read_other_users_vectors`: upsert as `u1`, query as `u2` → `[]`
  - `test_empty_user_id_rejected`: `UserStore(..., user_id="")` → `ValueError`
  - `test_upsert_long_source_batches_and_replaces`: 60,000-char note → every recorded upsert batch has ≤100 vectors; re-upserting the same source with 900 chars leaves exactly 2 vectors with its prefix
  - `test_delete_all_removes_only_that_user`: vectors for `u1` and `u2`; `delete_all` on `u1` → `u2` vectors remain
- [ ] **Step 2: Write failing route tests** (`test_index_routes.py`, store overridden with fakes): `POST /index` returns `{"indexed": n}` with n>0; `POST /index/delete` then removes them; `DELETE /users/u1` removes all `u1` vectors.
- [ ] **Step 3: Run** `python -m pytest tests/test_store.py tests/test_index_routes.py -v` → FAIL
- [ ] **Step 4: Implement** `store.py` and the three routes.
- [ ] **Step 5: Run** → PASS
- [ ] **Step 6: Commit** `feat(ai-service): user-scoped Pinecone store and index endpoints`

### Task 4: Prep pipeline with citation guard

**Files:**
- Create: `ai-service/app/prep.py`, `ai-service/tests/test_citation_guard.py`, `ai-service/tests/test_prep.py`
- Modify: `ai-service/app/schemas.py`, `ai-service/app/main.py`

**Interfaces:**
- Consumes: `UserStore.query`, `RetrievedChunk` (Task 3).
- Produces (`schemas.py`):
  - `Profile`: `skills: list[str] = []`, `targetRole: str = ""`, `seniority: str = "mid"`
  - `PrepRequest`: `userId: str`, `jobId: str`, `jobTitle: str`, `company: str`, `focus: str = ""`, `profile: Profile`
  - `Citation`: `sourceType: SourceType`, `sourceId: str`, `jobId: str`, `title: str`
  - `PrepResult`: `insufficientData: bool`, `message: str = ""`, `likelyQuestions: list[{question: str, why: str, citations: list[Citation]}]`, `weakSpots: list[{topic: str, detail: str, citations: list[Citation]}]`, `studyPlan: list[{item: str, citations: list[Citation]}]` (define named models `LikelyQuestion`, `WeakSpot`, `StudyItem`)
  - LLM-facing models `LLMQuestion`/`LLMWeakSpot`/`LLMStudyItem`/`LLMPrep` with identical fields except `citations: list[str]` (labels like `"S3"`) and `insufficientData: bool`
- Produces (`prep.py`):
  - `retrieve(store: UserStore, req: PrepRequest, k: int = 6) -> list[RetrievedChunk]` — pass 1 filter `{"jobId": {"$eq": req.jobId}}`; pass 2 filter `{"$and": [{"jobId": {"$ne": req.jobId}}, {"sourceType": {"$eq": "note"}}]}`; query text = `f"{jobTitle} at {company}. {focus}"`; dedupe by id, pass-1 first.
  - `apply_citation_guard(llm: LLMPrep, labelled: dict[str, RetrievedChunk]) -> PrepResult` — maps `S#` → `Citation`; drops unknown labels; drops items left with zero citations; if all three lists end empty → `insufficientData=True` with the empty-data copy.
  - `run_prep(store: UserStore, chat, req: PrepRequest) -> PrepResult` — retrieve; if nothing retrieved, return insufficient result **without calling `chat`**; else label chunks `S1..Sn`, call `chat.with_structured_output(LLMPrep)` with a system prompt that requires every item to cite `[S#]` labels and to set `insufficientData` when sources don't support prep; then guard.
  - `POST /prep` route using `get_store(req.userId)` and a `get_chat()` dependency (`ChatOpenAI(model=settings.openai_chat_model, temperature=0)`).

- [ ] **Step 1: Write failing guard tests** (`test_citation_guard.py`):
  - `test_unknown_label_dropped_and_item_kept_if_other_citation_valid`: citations `["S1","S9"]`, only S1 exists → one citation
  - `test_item_with_only_invalid_citations_removed`
  - `test_item_with_no_citations_removed`
  - `test_all_items_removed_sets_insufficient`: → `insufficientData is True`, `message == "Add notes from your rounds to get prep tailored to you"`
  - `test_citation_maps_metadata`: S1 metadata `{sourceType:"note", sourceId:"n1", jobId:"j1", title:"Round 2"}` → identical `Citation`
- [ ] **Step 2: Write failing pipeline tests** (`test_prep.py`, `FakeIndex` + a `FakeChat` whose `with_structured_output(...).invoke(...)` returns a canned `LLMPrep` and counts calls):
  - `test_retrieve_runs_two_passes_with_expected_filters`
  - `test_prep_with_no_matches_skips_llm`: empty store → `insufficientData True`, `FakeChat` call count 0
  - `test_prep_route_returns_guarded_result`: via `TestClient` with overrides → 200, every returned item has ≥1 citation
- [ ] **Step 3: Run** `python -m pytest tests/test_citation_guard.py tests/test_prep.py -v` → FAIL
- [ ] **Step 4: Implement** `prep.py`, schema additions, and replace the Task 1 placeholder route.
- [ ] **Step 5: Run** full suite `python -m pytest -v` → PASS
- [ ] **Step 6: Commit** `feat(ai-service): cited interview prep with code-enforced citation guard`

### Task 5: Reindex script and service README

**Files:**
- Create: `ai-service/scripts/__init__.py`, `ai-service/scripts/reindex.py`, `ai-service/tests/test_reindex.py`, `ai-service/README.md`

**Interfaces:**
- Consumes: `UserStore.upsert_sources` (Task 3), `IndexSource` (Task 2).
- Produces: `build_sources(job_docs: list[dict], note_docs: list[dict]) -> list[IndexSource]` (pure; same mapping as `lib/ai-sources.ts` in Task 7: JD text prefixed `f"{title} at {company}\n\n"`, `job_notes` only when non-empty, notes with null `jobId` → `"none"`, note `company`/`title` of the parent job looked up from `job_docs`, note `title` field = note title); `main()` CLI: `python -m scripts.reindex [--user USER_ID]` — reads `careerprofiles` where `aiEnabled: true` (optionally one user), loads that user's `jobs` and `notes` with `pymongo`, upserts.

- [ ] **Step 1: Write failing tests** for `build_sources`: job without description and notes → `[]`; job with both → 2 sources (`job_description`, `job_notes`, both `sourceId == jobId`); note with `jobId=None` → `jobId == "none"`; note under a job → carries that job's `company`.
- [ ] **Step 2: Run** `python -m pytest tests/test_reindex.py -v` → FAIL
- [ ] **Step 3: Implement** `reindex.py`; add `pymongo` to requirements.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Write `README.md`**: run locally (`uvicorn app.main:app --reload`), env vars (Task 1 `Settings`), Pinecone index setup (dimension 1536, cosine, serverless), Render deploy (start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`), the architecture diagram from spec §5.1, and a "Why each choice" section (shared namespace + choke point, citation guard, push-based sync, opt-in) — the author's interview talking points. Leave an "Eval results" heading filled by Task 6.
- [ ] **Step 6: Commit** `feat(ai-service): reindex script and README`

### Task 6: Eval suite

**Files:**
- Create: `ai-service/evals/__init__.py`, `ai-service/evals/fixtures/user.json`, `ai-service/evals/fixtures/cases.json`, `ai-service/evals/metrics.py`, `ai-service/evals/run.py`, `ai-service/evals/results/.gitkeep`, `ai-service/tests/test_eval_metrics.py`
- Modify: `ai-service/README.md` (Eval results section)

**Interfaces:**
- Consumes: `build_sources` (Task 5), `UserStore` (Task 3), `retrieve`, `run_prep` (Task 4).
- Produces (`metrics.py`, pure):
  - `recall_at_k(expected: set[str], retrieved: list[str]) -> float` (1.0 when `expected` empty)
  - `hit(expected: set[str], retrieved: list[str]) -> bool`
  - `citation_validity(result: PrepResult, retrieved_source_ids: set[str]) -> float`
  - `judge_groundedness(chat, item_text: str, cited_texts: list[str]) -> bool` (LLM-as-judge, `with_structured_output` of `{supported: bool, reason: str}`)
- Fixtures: `user.json` — 8 jobs, ~25 notes, user id `eval-user`; at least two weak spots recur across ≥3 companies (e.g. caching trade-offs, behavioural STAR answers); 3 notes with no job. `cases.json` — ~20 entries `{id, jobId, focus, expectedSourceIds: [...], expectInsufficient: bool}`, including ≥3 `expectInsufficient: true` (jobs with no notes/JD and unrelated focus).
- `run.py`: indexes fixtures into namespace `eval` (skip with `--no-index`), runs every case, prints a table (case, recall@k, hit, citation validity, groundedness %, insufficient correct) plus averages, and writes `evals/results/<UTC timestamp>.json` including `k`, `chunk_size`, `chunk_overlap`, chat model.

- [ ] **Step 1: Write failing tests** for `recall_at_k`, `hit`, `citation_validity` (e.g. expected `{"a","b"}`, retrieved `["a","c"]` → recall 0.5, hit True; 2 of 3 citations in set → 0.667).
- [ ] **Step 2: Run** `python -m pytest tests/test_eval_metrics.py -v` → FAIL
- [ ] **Step 3: Implement** `metrics.py`, fixtures, `run.py`.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Run the real eval** (needs keys): `python -m evals.run` → table prints, results JSON written. Copy the averages into the README "Eval results" section with the date and settings. If keys are unavailable, note that in the README and report it.
- [ ] **Step 6: Commit** `feat(ai-service): retrieval and groundedness eval suite`

### Task 7: Next.js data layer — models, AI client, sources, daily cap

**Files:**
- Create: `models/AiUsage.ts`, `lib/ai-client.ts`, `lib/ai-sources.ts`, `lib/ai-usage.ts`, `lib/ai-sources.test.ts`, `lib/ai-usage.test.ts`, `lib/ai-client.test.ts`
- Modify: `models/CareerProfile.ts`, `lib/rate-limit.ts`, `package.json` (+ `mongodb-memory-server` dev)

**Interfaces:**
- Produces:
  - `CareerProfile` fields `aiEnabled: { type: Boolean, default: false }`, `aiEnabledAt: { type: Date, default: null }`
  - `AiUsage` model: `userId: string`, `date: string` (`YYYY-MM-DD` UTC), `count: number`; **unique** index `{ userId: 1, date: 1 }`
  - `lib/ai-client.ts`: types mirroring Tasks 2/4 (`IndexSource`, `SourceRef`, `PrepProfile`, `Citation`, `PrepResult`); `aiConfigured(): boolean` (true iff `AI_SERVICE_URL` and `AI_SERVICE_SECRET` set); `indexSources(userId, sources: IndexSource[]): Promise<void>`; `deleteSources(userId, refs: SourceRef[]): Promise<void>`; `deleteUserVectors(userId): Promise<void>`; `requestPrep(input: {userId, jobId, jobTitle, company, focus, profile}): Promise<PrepResult>`; `pingHealth(): Promise<boolean>`. All send `X-AI-Service-Key`; timeouts via `AbortSignal.timeout` — 10s for index calls, 55s for prep, 3s for health. When not configured, every function resolves without a network call (`requestPrep` throws `AiNotConfiguredError`). Non-2xx → throws `AiServiceError`.
  - `lib/ai-sources.ts` (pure): `jobToSources(job): IndexSource[]`, `noteToSource(note, job?): IndexSource | null` (null if empty content), `jobSourceRefs(jobId): SourceRef[]` (both `job_description` and `job_notes`), same mapping rules as Task 5 `build_sources`.
  - `lib/ai-usage.ts`: `DAILY_PREP_LIMIT = 5`; `utcDay(d = new Date()): string`; `consumePrep(userId): Promise<{ allowed: boolean; remaining: number }>`; `refundPrep(userId): Promise<void>` (`$inc: -1`, floor 0); `remainingPreps(userId): Promise<number>`.
  - `lib/rate-limit.ts`: `LimitTier` gains `"ai"` = `makeLimiter(10, "1 m")`.
- `consumePrep` algorithm (atomic under concurrency):
  ```ts
  try {
    const doc = await AiUsage.findOneAndUpdate(
      { userId, date, count: { $lt: DAILY_PREP_LIMIT } },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    return { allowed: true, remaining: DAILY_PREP_LIMIT - doc.count };
  } catch (e) {
    if (isDuplicateKey(e)) return { allowed: false, remaining: 0 }; // filter missed at limit → upsert collides
    throw e;
  }
  ```

- [ ] **Step 1: Write failing tests:**
  - `lib/ai-sources.test.ts`: mirrors the four Task 5 cases.
  - `lib/ai-usage.test.ts` (add `mongodb-memory-server` as a devDependency; it is not in the project yet): `allows 5 then blocks the 6th`; `consumes at most 5 even when called concurrently` (`Promise.all` of 8 calls → exactly 5 `allowed`); `refund restores one`; `new UTC day resets`.
  - `lib/ai-client.test.ts` (stub `fetch`): sends the secret header; no fetch when `AI_SERVICE_URL` unset; non-2xx throws `AiServiceError`.
- [ ] **Step 2: Run** `npx vitest run lib/ai-sources.test.ts lib/ai-usage.test.ts lib/ai-client.test.ts` → FAIL
- [ ] **Step 3: Implement** the files above. Annotate `ai-usage.test.ts` with `// @vitest-environment node`.
- [ ] **Step 4: Run** → PASS; then `npm test` → whole suite still passes
- [ ] **Step 5: Commit** `feat(ai): AI client, source mapping, and atomic daily prep cap`

### Task 8: Prep, status, and enable API routes

**Files:**
- Create: `pages/api/ai/prep.ts`, `pages/api/ai/status.ts`, `pages/api/ai/enable.ts`, `pages/api/ai/ai-routes.test.ts`

**Interfaces:**
- Consumes: Task 7 everything; `withAuth`, `errorResponse`, `successResponse`, `methodNotAllowed` (`lib/api-helpers.ts`); `enforceRateLimit` with tier `"ai"`.
- Produces:
  - `POST /api/ai/prep` body `{ jobId: string, focus?: string }` (focus trimmed, max 200 chars). Order: auth → `ai` rate limit → AI configured else 503 → profile `aiEnabled` else 403 `{error:"AI copilot is not enabled"}` → job `findOne({_id: jobId, userId})` else 404 → `consumePrep` else 429 with the cap copy → `requestPrep` (on throw: `refundPrep`, 503 `{error:"The AI service is unavailable right now. Please try again in a minute."}`) → **stale-citation filter**: load the user's notes by cited `note` ids and jobs by cited job ids; drop citations whose source no longer exists; drop items left empty; if all empty set `insufficientData` with the empty-data copy → 200 `{ result: PrepResult, remaining: number }`. Export `config = { maxDuration: 60 }`.
  - `GET /api/ai/status` → `{ configured: boolean, enabled: boolean, remaining: number }`; when configured, also fires `pingHealth()` without awaiting the result beyond 3s (warm-up).
  - `POST /api/ai/enable` body `{ enabled: boolean }` (`mutation` tier). `true`: set `aiEnabled: true, aiEnabledAt: now` (upsert profile), then load all the user's jobs and notes, map with `ai-sources`, `indexSources` in batches of 50 — awaited (the user is waiting on the enable click), failures → 502 but flag stays on (reindex script repairs). `false`: `deleteUserVectors`, then set `aiEnabled: false`. → `{ enabled }`.

- [ ] **Step 1: Write failing tests** (`ai-routes.test.ts`, `// @vitest-environment node`, mock `@clerk/nextjs/server` `getAuth`, mock `lib/ai-client`, Mongo via the same in-memory setup as Task 7):
  - `rejects unauthenticated` → 401
  - `returns 403 when not enabled`
  - `returns 404 for another user's job without consuming usage` (then `remainingPreps` still 5, `requestPrep` not called)
  - `returns 429 with the cap copy after 5 preps`
  - `refunds usage and returns 503 when the AI service fails` (`remaining` back to 5)
  - `drops citations to deleted notes` (AI result cites `n1` which isn't in Mongo → item removed)
  - `enable true indexes all jobs and notes`; `enable false deletes vectors and clears flag`
- [ ] **Step 2: Run** `npx vitest run pages/api/ai/ai-routes.test.ts` → FAIL
- [ ] **Step 3: Implement** the three routes.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat(ai): prep, status, and opt-in API routes`

### Task 9: Sync hooks and account deletion

**Files:**
- Create: `lib/ai-sync.ts`, `lib/ai-sync.test.ts`
- Modify: `pages/api/jobs/index.ts` (POST), `pages/api/jobs/[id].ts` (PUT/PATCH, DELETE), `pages/api/notes/index.ts` (POST), `pages/api/notes/[id].ts` (PUT/PATCH, DELETE), `pages/api/clerk/webhook.ts`, `package.json` (+ `@vercel/functions`)

**Interfaces:**
- Consumes: Task 7 client and source mappers.
- Produces (`lib/ai-sync.ts`): `syncJobSaved(userId, job)`, `syncJobDeleted(userId, jobId)`, `syncNoteSaved(userId, note)`, `syncNoteDeleted(userId, noteId)`, `syncUserDeleted(userId)`. Each returns `void` synchronously and schedules work with `waitUntil` from `@vercel/functions`; the scheduled work returns early unless `aiConfigured()` and (except `syncUserDeleted`) the user's profile has `aiEnabled: true`; all errors are caught and `console.error`ed.
  - `syncJobSaved`: index `jobToSources(job)`, delete refs for any of `job_description`/`job_notes` now empty, and re-index the job's Note documents (keeps `company`/`title` current).
  - `syncJobDeleted`: delete `jobSourceRefs(jobId)` only (notes stay indexed as history).
  - `syncNoteSaved`: look up the parent job (if any) for `company`; index `noteToSource`.
- Route changes: call the matching helper after the successful Mongo write, before `successResponse`. Webhook: handle `evt.type === "user.deleted"` → `syncUserDeleted(evt.data.id)` (widen the local event type accordingly).

- [ ] **Step 1: Write failing tests** (`lib/ai-sync.test.ts`, mock `@vercel/functions` so `waitUntil` captures the promise, mock the client):
  - `does nothing for a user without aiEnabled`
  - `job save indexes JD and job notes and re-indexes its notes`
  - `job delete removes only job sources`
  - `swallows AI service errors` (client throws → captured promise resolves, no throw)
  - `user deleted removes vectors even without a profile`
- [ ] **Step 2: Add a route test** (in the existing style, or `pages/api/notes/notes-sync.test.ts`): `note POST still returns 201 when the AI client throws`.
- [ ] **Step 3: Run** `npx vitest run lib/ai-sync.test.ts pages/api/notes` → FAIL
- [ ] **Step 4: Implement** `ai-sync.ts` and the route/webhook edits.
- [ ] **Step 5: Run** → PASS; `npm test` → whole suite passes
- [ ] **Step 6: Commit** `feat(ai): keep the index in sync on job/note changes and account deletion`

### Task 10: UI — Prep panel, settings toggle, demo sample, docs

**Files:**
- Create: `components/PrepPanel.tsx`, `components/PrepPanel.test.tsx`, `lib/demo-prep-sample.ts`
- Modify: `src/app/dashboard/jobs/[id]/page.tsx` (render `<PrepPanel jobId={job._id} />` near `NotesPanel`), `src/app/dashboard/settings/page.tsx` (AI copilot on/off toggle using `POST /api/ai/enable`), `src/app/demo/page.tsx`, `docs/PRODUCTION_SETUP.md`

**Interfaces:**
- Consumes: `/api/ai/status`, `/api/ai/enable`, `/api/ai/prep` (Task 8); `PrepResult`, `Citation` types (Task 7).
- Produces: `PrepPanel({ jobId, sample }: { jobId?: string; sample?: PrepResult })`. States, in order:
  1. status loading;
  2. `configured: false` → render nothing;
  3. `enabled: false` → enable card with the exact consent copy and a "Turn on AI prep" button;
  4. ready → optional focus input (placeholder "e.g. system design round"), "Prep for this interview" button, "N of 5 preps left today";
  5. requesting → "Preparing…", switching to "Waking up the AI service…" after 8s;
  6. result → three sections (Likely questions, Weak spots, Study plan), each item with citation chips: `note` → link `/dashboard/notes/{sourceId}`; `job_description`/`job_notes` on this job → scroll to the job page's description; on another job → link `/dashboard/jobs/{jobId}`;
  7. `insufficientData` → the message;
  8. 429 → the cap copy; 503 → the service-unavailable message with a retry button.
  - With `sample` set (demo): render the result state directly, label "Sample — sign up to prep with your own notes", no fetches.
  - `lib/demo-prep-sample.ts`: `DEMO_PREP_SAMPLE: PrepResult` written from the demo dataset in `lib/demo-data.ts` (cite its real demo note/job ids).
- Use the existing Stitch design tokens and component patterns (see `NotesPanel.tsx`, `ScoreExplanation.tsx`); respect reduced motion as the rest of the app does.

- [ ] **Step 1: Write failing tests** (`PrepPanel.test.tsx`, stub `fetch`, render via `test/render.tsx`):
  - `renders nothing when AI is not configured`
  - `shows the consent copy when not enabled`
  - `renders cited results with note links` (chip href `/dashboard/notes/n1`)
  - `shows the cap copy on 429`
  - `sample mode renders without fetching`
- [ ] **Step 2: Run** `npx vitest run components/PrepPanel.test.tsx` → FAIL
- [ ] **Step 3: Implement** `PrepPanel`, the demo sample, the job page/settings/demo wiring.
- [ ] **Step 4: Run** `npm test` → all pass; `npm run lint` and `npm run build` → clean
- [ ] **Step 5: Update `docs/PRODUCTION_SETUP.md`**: Next.js env (`AI_SERVICE_URL`, `AI_SERVICE_SECRET`), ai-service env, Render setup, Pinecone index creation, Clerk webhook must now also subscribe to `user.deleted`, and how to run `python -m scripts.reindex`.
- [ ] **Step 6: Commit** `feat(ai): interview prep panel, settings toggle, and demo sample`
