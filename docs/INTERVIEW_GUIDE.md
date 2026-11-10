# TrackIQ — Complete Interview Guide

Everything an interviewer can ask about this project — motivation, product,
architecture, design decisions, each engine, security, testing, scale,
challenges, limitations, and behavioral questions — with answers that match
the code. If you say it, you can open the file that proves it.

Companion doc: [`INTERVIEW_READINESS.md`](INTERVIEW_READINESS.md) (what to set
up and rehearse before the interview).

**Contents**

1. [The 30-second pitch](#1-the-30-second-pitch)
2. [The 2-minute walkthrough](#2-the-2-minute-walkthrough)
3. [Motivation and product thinking](#3-motivation-and-product-thinking)
4. [Live demo script](#4-live-demo-script)
5. [Architecture](#5-architecture)
6. [Tech choices and alternatives](#6-tech-choices-and-alternatives)
7. [The six engines, explained](#7-the-six-engines-explained)
8. [Security](#8-security)
9. [Testing and CI](#9-testing-and-ci)
10. [Performance and scalability](#10-performance-and-scalability)
11. [Frontend, UX, and accessibility](#11-frontend-ux-and-accessibility)
12. [Challenges I faced (STAR stories)](#12-challenges-i-faced-star-stories)
13. [Limitations — the honest list](#13-limitations--the-honest-list)
14. [What I'd do differently and the roadmap](#14-what-id-do-differently-and-the-roadmap)
15. [Question bank by category](#15-question-bank-by-category)
16. [Code walkthrough map](#16-code-walkthrough-map)
17. [Numbers to have ready](#17-numbers-to-have-ready)
18. [Things to avoid saying](#18-things-to-avoid-saying)
19. [One-page cheat sheet](#19-one-page-cheat-sheet)
20. [AI Interview Prep Copilot — deep dive](#20-ai-interview-prep-copilot--deep-dive)

---

## 1. The 30-second pitch

> "TrackIQ is a full-stack SaaS for job seekers. It tracks applications, keeps
> private interview notes, and runs six deterministic, explainable engines over
> your pipeline — job fit, offer ranking with a what-if simulator, career
> health, a follow-up priority queue, and interview reflection. Every score
> shows its work, so you can see *why* an offer ranks first and what would
> change it.
>
> On top of that there's an opt-in AI interview prep copilot: a separate
> Python service that does retrieval-augmented generation over *your own* job
> descriptions and notes, with every suggestion cited and an eval suite that
> measures retrieval recall and groundedness.
>
> It's Next.js 15 and TypeScript on MongoDB, with Clerk auth, Stripe
> subscriptions where plans change only through verified webhooks, Upstash
> rate limiting, Resend email, and a Vercel cron for reminder digests; the AI
> service is FastAPI, LangChain, OpenAI and Pinecone. It has about 430 app
> tests, 66 Python tests and Playwright browser tests, and CI runs lint,
> typecheck, tests, security audits and a production build on every push."

Then stop and let them pick a thread. The pitch plants hooks (explainable
engines, cited RAG with evals, webhook-only upgrades, property tests) that
lead to your strongest deep dives. For an AI-engineer role, lead with the
copilot (§20) and keep the engines as the "I don't use AI where math is
better" point.

---

## 2. The 2-minute walkthrough

Use **Problem → Solution → Architecture → Hardest part → Result**.

1. **Problem (15s).** Candidates juggle 10–50 applications in spreadsheets,
   forget follow-ups, and pick offers on gut feel. Most tooling is built for
   recruiters, not candidates.
2. **Solution (20s).** A private workspace: tracker + notes + an offer decision
   engine. The differentiator is *explainability* — not "71", but "+39 for
   skill coverage, +20 for title match, held back by 4 missing skills".
3. **Architecture (30s).** App Router UI, Pages Router API routes, Mongoose
   models. Every route is wrapped in `withAuth`, so identity comes from the
   Clerk session, never the request. Engines are pure TypeScript in `lib/`,
   shared by the dashboard, the public demo, and the landing page.
4. **Hardest part (40s).** For AI roles: keeping RAG answers honest and
   private (§20: citation guard, per-user retrieval, consent races). For
   full-stack roles: billing correctness under out-of-order webhooks (§12.11)
   or explainable normalized scoring (§7.1). Tell it as a story with a
   decision and a trade-off.
5. **Result (15s).** Built to deploy on Vercel, with the AI service on Render (say "deployed" only for what is live and you can show);
   about 430 app tests, 66 Python tests and Playwright browser tests; CI green
   on `main`; a security audit with fixes; error monitoring. Quote eval
   numbers (§20.7) once you have run them. Only say "it's live" for parts that
   are.

---

## 3. Motivation and product thinking

**Why did you build this?**
Job searching is a pipeline problem — dozens of parallel processes at
different stages, each with deadlines — managed with spreadsheets and memory.
I wanted a tool that not only stores the pipeline but helps you act on it:
who to follow up with today, which offer is actually best *for you*, and
what's weak in your search. It's also a project that exercises the whole
stack: auth, multi-tenant data, payments, background jobs, and non-trivial
domain logic.

**Who is it for?** (from `docs/PRD.md`)
- Active candidates running 10–50 applications who lose track of follow-ups.
- Senior candidates weighing multiple offers who need structured comparison.
- Career switchers who need visibility into conversion rates and momentum.

**Why candidate-side?** Recruiter tools (ATSs) are a crowded, enterprise
market; the candidate is underserved and makes the higher-stakes personal
decision.

**Why "explainable" engines *and* an AI copilot?** A score you can't question
is a score you can't trust when the decision is your career, so ranking and
scoring are deterministic: auditable, property-tested, free to run, private.
Language is where a model genuinely helps: turning a job description and
months of messy interview notes into likely questions and a study plan. So
AI is used only there, only after the user opts in, and every output item
must cite one of the user's own sources or it's dropped (§20).

**Why freemium at $9/mo Pro?** Free covers a casual search (10 applications);
heavy users and people who want their data out (export) pay. It also made
billing a real engineering problem worth solving properly.

**How would you measure success?** (PRD §9) Activation: % of new users adding
≥3 applications in week 1. Retention: weekly actives. Conversion: free→Pro.
Engagement: follow-up suggestions acted on.

**What's out of scope (v1)?** Job-board scraping/import, recruiter features,
team collaboration, a mobile app.

---

## 4. Live demo script

Open these in tabs **before** the interview.

| Step | Where | Show | Say |
|------|-------|------|-----|
| 1 | `/` | Hero preview | "Not a mockup — the landing page imports the real engines and runs them on sample data." |
| 2 | `/demo` | Career Health, Priority Queue, Job Fit | "Every card shows what helped and what held it back." |
| 3 | `/demo` → Offer Intelligence | Drag a weight slider | "The ranking re-orders live; every runner-up gets a concrete path to #1." |
| 4 | `/dashboard/jobs` | Add, edit stage, search, filter | "Every query is scoped by the session's userId." |
| 5 | Free account at 9 jobs | Add 10th, then 11th | "Client gate is advisory; the server returns 403 and the UI maps it to the upgrade prompt." |
| 6 | `/dashboard/offers` | Export as Free user | "Export is Pro-only, enforced on both sides." |
| 7 | Pricing → Stripe test checkout | Card `4242…`, then Stripe webhook log | "Checkout doesn't upgrade anyone. Only the signed webhook does." |
| 8 | Theme toggle, mobile width | — | "Tokens in CSS variables, mirrored in TS for canvas charts; parity is property-tested." |

If something breaks live, narrate how you'd debug it. Calm debugging is a
signal too. Fallback: `/demo` needs no backend.

---

## 5. Architecture

### 5.1 System diagram

```
 Browser (React client components, framer-motion, Chart.js)
   │  fetch('/api/jobs')  — no user id in the request
   ▼
 Vercel ── middleware.ts (clerkMiddleware: protect all non-public routes)
   │
   ▼
 pages/api/*  ──► withAuth()          → userId from Clerk session (getAuth)
                  enforceRateLimit()  → Upstash sliding window, per user
                  connectDB()         → cached Mongoose connection (globalThis)
                  Model.find({ userId, ... })  → every query user-scoped
   │
   ├─ /api/stripe/checkout  → creates session with metadata.userId, NO upgrade
   ├─ /api/stripe/webhook   → raw body + signature verify → UserPlan upsert
   ├─ /api/stripe/portal    → customer id resolved server-side
   ├─ /api/clerk/webhook    → Svix verify → welcome email (Resend)
   └─ /api/cron/follow-up-reminders ← Vercel Cron 08:00 UTC daily,
                                      Bearer CRON_SECRET, Redis SET NX EX dedupe

    ├─ /api/ai/prep|enable|status ──► AI service (FastAPI on Render)
   │      X-AI-Service-Key (HMAC compare)    LangChain → OpenAI embeddings + chat
   │      5 preps/day, consent flag          Pinecone (every query filtered by userId)
   └─ job/note saves ── waitUntil ──► background re-index of what changed

 lib/  pure engines: scoring, offer-intelligence, career-fit, career-health,
       follow-up-intelligence, interview-reflection   (no I/O → unit-testable)
 instrumentation*.ts  Sentry (off unless a DSN is set; bodies/PII scrubbed)
```

### 5.2 Folder structure

| Path | Responsibility |
|------|----------------|
| `src/app/**` | App Router pages: landing, demo, pricing, privacy, dashboard (overview, jobs, job detail, notes, offers, intelligence, settings), sign-in/up, 404 |
| `pages/api/**` | 14 REST API routes |
| `models/**` | Mongoose schemas |
| `lib/**` | Engines, plan gate, view-state resolver, rate limiting, email, DB, CSV |
| `hooks/**` | Data hooks: `useJobs`, `useNotes`, `useOffers`, `useCareerProfile` |
| `components/**` | UI; `components/ui` = design-system primitives; `components/intelligence` = engine UIs |
| `middleware.ts` | Route protection; public-route allowlist |
| `vercel.json` | Cron schedule |
| `.github/workflows/ci.yml` | CI |

### 5.3 Request lifecycle (e.g. editing a job)

1. `JobFormDrawer` calls `updateJob()` from `useJobs`.
2. `PUT /api/jobs/:id` → middleware confirms a session.
3. `withAuth` reads `userId` from Clerk; rejects with 401 if absent.
4. `isObjectId(id)` → 400 on a malformed id.
5. `enforceRateLimit(tier: "mutation")` → 429 if over 40 writes/min.
6. Body filtered to the editable-field whitelist.
7. `Job.findOneAndUpdate({ _id: id, userId }, update, { runValidators: true })`
   → 404 if it isn't yours.
8. Hook updates local state; the UI re-renders and engines recompute via
   `useMemo`.

### 5.4 Rendering and data flow

- Dashboard pages are **client components**. Data is fetched by custom hooks
  that expose `{ data, loading, error, refetch, create/update/delete }`.
- Every data view goes through one pure resolver, `resolveViewState`
  (`lib/view-state.ts`), which yields exactly one of `loading | empty |
  error | ready`. `<DataView>` renders the matching skeleton, empty state,
  error-with-retry, or content.
- **Engines run in the browser** over already-fetched data, memoized with
  `useMemo` (e.g. `src/app/dashboard/intelligence/page.tsx`). No extra
  round trips, and the what-if simulator re-ranks instantly as sliders move.
- **State management:** local hook state plus React context for toasts and
  theme (`next-themes`). No Redux. The data is per-page and small, so a
  global store would be overhead. With more shared server state I'd adopt
  TanStack Query for caching and invalidation.

### 5.5 Data model (`docs/SCHEMA.md`)

| Collection | Key fields | Indexes |
|------------|-----------|---------|
| `Job` | userId, title, company, stage (7-value enum), status (active/closed), salary, dateApplied, jobDescription | `{userId, createdAt}`, `{userId, stage}`, `{userId, company}` |
| `Note` | userId, jobId (nullable), title, content, round | `{userId, createdAt}`, `{userId, jobId}` |
| `Offer` | userId, offerId, company, salaryBase, bonus, equity, signingBonus, ptoDays, remoteType, techStack[], growthScore, brandScore (0–10), status | `{userId, createdAt}`, unique `offerId` |
| `CareerProfile` | userId (unique), skills[], targetRole, seniority | unique `userId` |
| `UserPlan` | userId (unique), plan (free/pro), customerId, status, trialEnd | unique `userId` |

Every compound index **leads with `userId`** because every query filters by
it. Relations (note → job) are string references enforced in app code, not
foreign keys.

**Stage model:** `applied → screening → interview → offer → accepted`, plus
the terminal `rejected` and `withdrawn`. `status` (active/closed) is separate
from `stage`, so a rejected job can stay visible as history.

### 5.6 API design

| Route | Methods | Notes |
|-------|---------|-------|
| `/api/jobs` | GET, POST | POST enforces the free-tier limit (403 at 10) |
| `/api/jobs/[id]` | GET, PUT/PATCH, DELETE | ObjectId check, field whitelist, ownership in the query |
| `/api/notes` | GET (`?jobId=`), POST | |
| `/api/notes/[id]` | GET, PUT/PATCH, DELETE | |
| `/api/offers` | GET, POST | |
| `/api/offers/[id]` | GET, PUT/PATCH, DELETE | |
| `/api/career-profile` | GET, PUT | upsert; input sanitized (≤50 skills, enum seniority) |
| `/api/user/plan` | GET | |
| `/api/stripe/checkout` | POST | billing rate tier (8/min) |
| `/api/stripe/portal` | POST | |
| `/api/stripe/webhook` | POST | raw body, signature verified |
| `/api/clerk/webhook` | POST | Svix verified |
| `/api/cron/follow-up-reminders` | GET/POST | `CRON_SECRET` bearer |
| `/api/health` | GET | public |

Conventions: JSON errors `{ error }` (with details only outside production),
correct status codes (400/401/403/404/405/429/500), `Allow` header on 405.

### 5.7 Auth flow

Clerk handles sign-up and sign-in (hosted UI at `/sign-in`, `/sign-up`).
`middleware.ts` protects everything except an explicit public list (landing,
pricing, privacy, demo, auth pages, health, webhooks, cron). API routes call
`getAuth(req)` server-side. The client never sends a user id.

### 5.8 Billing flow

```
User → POST /api/stripe/checkout → Stripe Checkout (metadata.userId on session + subscription)
     → pays → Stripe → POST /api/stripe/webhook (signed)
              checkout.session.completed      → plan=pro
              customer.subscription.updated   → planFromSubscriptionStatus()
              customer.subscription.deleted   → plan=free
     → "Manage billing" → POST /api/stripe/portal → customer id from UserPlan
```

### 5.9 Background jobs

Vercel Cron calls `/api/cron/follow-up-reminders` daily. It loads active
jobs, groups them by user, runs the Priority Queue engine, and emails a
digest via Resend. Redis `SET reminded:<userId> NX EX 72000` guarantees at
most one email per user per ~20h, even when the job is retried.

---

## 6. Tech choices and alternatives

| Choice | Why | Alternative considered |
|--------|-----|------------------------|
| Next.js 15 | One repo for UI + API, Vercel-native, cron support | Separate React SPA + Express (more ops) |
| TypeScript strict | Shared types across API, hooks, engines | — |
| MongoDB + Mongoose | Per-user documents with optional fields, no cross-user joins | Postgres + Prisma (better for relational reporting and constraints) |
| Clerk | Secure auth, sessions, and webhooks without building them | NextAuth/Auth.js (more control, more work) |
| Stripe Checkout + Portal | PCI handled by Stripe; hosted billing UI | Custom card form (unnecessary risk) |
| Upstash Redis | HTTP-based Redis that works across serverless instances | In-memory limiter (broken in serverless) |
| Resend | Simple transactional email API | SES (more setup) |
| Tailwind v4 + CSS variables | Fast theming; tokens shared with charts | CSS-in-JS (runtime cost) |
| Chart.js | Small and sufficient for line/doughnut | D3 (overkill), Recharts |
| Vitest + fast-check | Fast, ESM-native; property tests for invariants | Jest |
| Pages Router for API | Raw body for webhook signature checks via `bodyParser: false` | App Router Route Handlers (`await req.text()`) — the migration path |

---

## 7. The six engines, explained

All are pure functions in `lib/`. Same input, same output. Each returns its
reasoning alongside its score.

### 7.1 Offer Intelligence (`lib/offer-intelligence.ts`)
- **Six dimensions:** compensation (base + bonus + signing), growth (1–10),
  tech stack (count), brand (1–10), flexibility (remote/hybrid/onsite + PTO),
  location.
- **Min-max normalized across *your* offers:** best = 100, worst = 0 on each
  dimension. If all offers are equal on a dimension (`max === min`), everyone
  gets 100 rather than dividing by zero.
- **Weights** are user-controlled and normalized to sum to 1. Overall score =
  Σ(weight × dimension score).
- **Rationale:** `whyTop` names the winner's strongest weighted dimensions;
  `pathsToTop` tells each runner-up what would need to change.
- **What-if simulator:** `simulateWhatIf` re-ranks with new weights and
  reports ▲/▼ movement against the baseline.
- **Why relative?** "$180k" is only good or bad compared with your
  alternatives, and normalization makes dollars and 1–10 ratings comparable.
  **Consequence:** adding an offer changes everyone's scores. They are
  rankings, not grades.

### 7.2 Weighted offer scoring (`lib/scoring.ts`)
The original 4-factor engine (cash 40%, equity 20%, growth 20%, brand 20%)
used by the Offers matrix: same normalization, `isBest` flag, and a written
explanation. Property-tested: scores in 0–100, sorted descending,
deterministic, `isBest` is exactly the argmax set.

### 7.3 Job Fit (`lib/career-fit.ts`)
- Skills are extracted from the job text with a curated 40-term lexicon
  (`lib/skills.ts`), whole-word alias matching (e.g. "golang" → Go).
- **Points:** skill coverage up to 70, role-title alignment up to 20,
  seniority alignment up to 10 (it can subtract on a big gap), bonus skills
  up to +5.
- Output: score, strong matches, missing skills, suggested learning, *what
  helped*, *what held it back*, and a confidence level (lowered when the job
  text has too few detectable skills).
- Note: "held it back" shows points *not earned* (counterfactual), not
  subtractions — that's why the helped items alone sum to the score.

### 7.4 Career Health (`lib/career-health.ts`)
Five weighted metrics → 0–100 score and a grade:

| Metric | Weight | Definition |
|--------|--------|------------|
| Response rate | 25% | share of applications past "applied" |
| Interview conversion | 25% | share reaching interview or later |
| Offer conversion | 20% | offers ÷ interviews |
| Momentum | 15% | applications in last 30 days ÷ 8 (capped) |
| Follow-up consistency | 15% | 1 − stale items ÷ max(in-flight, 5) |

Plus prioritized recommendations, e.g. "clear your follow-up queue".

### 7.5 Follow-up Priority Queue (`lib/follow-up-intelligence.ts`)
- Staleness thresholds: applied 10 days, screening 5, interview 5, offer 2.
- Stage value: offer 100, interview 80, screening 60, applied 35.
- `urgency = min(2, daysStale / threshold)`;
  `value = min(100, stageValue × (0.5 + 0.25 × urgency))`.
- Impact: high ≥ 80, medium ≥ 55. Each item has an action, a why, and the
  expected impact. The same engine powers the email digest.

### 7.6 Interview Reflection (`lib/interview-reflection.ts`)
Rule-based analysis of interview notes: strengths, weaknesses, recurring
mistakes, topics to revise, and a confidence trend (−1..1 per note,
improving/declining/steady). Every insight lists the notes it came from.
The interface is designed so an LLM could replace the analyzer without
changing callers.

---

## 8. Security

| Threat | Mitigation | Where |
|--------|-----------|-------|
| Accessing another user's data (IDOR) | `userId` from session; every query `{ _id, userId }` → 404 if not yours | `lib/api-helpers.ts`, all routes |
| Spoofed identity | Client never sends a user id; property test fuzzes client identity sources | `data-isolation.property.test.tsx` |
| Signed-out access to pages | Clerk middleware with `await auth.protect()`; redirect to our own `/sign-in`; E2E-tested | `middleware.ts`, `e2e/` |
| Fake payment upgrade | Upgrade only via signed webhook; status mapping fails closed | `stripe/webhook.ts`, `lib/plans.ts` |
| Out-of-order / replayed Stripe events | Every event re-fetches the subscription from Stripe; plan is bound to one subscription id | `stripe/webhook.ts`, `lib/stripe.ts` |
| Webhook forgery | Stripe signature on raw body; Svix for Clerk; generic error text | webhook routes |
| Mass assignment | Allowlist of editable fields on jobs and offers (blocks `$set`, `userId`); `userId` immutable | `jobs/[id].ts`, `offers/[id].ts` |
| Malformed / oversized input | ObjectId check, length caps on every text field, http(s)-only links, 400 on validation errors | models, `[id]` routes |
| Free-tier race | Re-count after insert and roll back the extra job | `jobs/index.ts` |
| Abuse / brute force | Tiered Upstash rate limits per user, including an `ai` tier | `lib/rate-limit.ts` |
| XSS / clickjacking | CSP allowlist (`default-src 'self'`, Clerk/Stripe only), `frame-ancestors 'none'`, nosniff, HSTS; React escaping, no raw-HTML sinks | `next.config.mjs` |
| CSV / formula injection | Cells starting `= + - @` prefixed with `'` | `lib/csv.ts` |
| Unauthenticated cron | `CRON_SECRET` compared in constant time; refuses to run if unset | cron route |
| Billing portal / redirect hijack | Customer id from DB; Stripe redirect URLs from config, never the `Origin` header | `stripe/portal.ts`, `lib/app-url.ts` |
| Cross-tenant AI retrieval | One choke point (`UserStore`) adds a mandatory `userId` filter to every vector query; vector ids prefixed by user | `ai-service/app/store.py` |
| LLM inventing facts | Citation guard in code drops any item without a real retrieved source | `ai-service/app/prep.py` |
| AI spend abuse | 5 preps/day (atomic unique index), 10/min rate limit, token and time caps, request size caps | `lib/ai-usage.ts`, AI service |
| Data after account deletion | Clerk `user.deleted` cancels Stripe subscriptions and erases every collection and the vectors; retries on failure | `lib/account-deletion.ts` |
| Leaked secrets | A database password was found in git history → rotated; lesson: rotate first, history cleanup second | — |
| Test code deployed as routes | Route tests moved out of `pages/`; a test fails if one returns | `test/no-tests-in-pages.test.ts` |
| Vulnerable dependencies | CI fails on high/critical prod advisories; `pip-audit`; accepted risks documented with review dates | `.github/workflows/ci.yml`, `docs/SECURITY.md` |

A full OWASP-style audit was run against the codebase (the security-audit
skill in `.claude/skills/`); every lead it found is fixed in git history.

---

## 9. Testing and CI

- **About 430 app tests** (Vitest, Testing Library, jsdom) and **66 Python
  tests** (pytest, with fake OpenAI/Pinecone clients, so they run offline).
- **Unit:** every engine, CSV, billing status mapping, plan gate, AI citation
  handling, unsubscribe tokens, Sentry scrubbing.
- **Integration against a real in-memory MongoDB** (`mongodb-memory-server`):
  the atomic prep cap under concurrency, AI routes, account erasure, email
  preferences, job-stage normalisation.
- **Property-based (fast-check):** offer scores stay in 0–100, sorted,
  deterministic; filters return exactly the matching subset; plan gate never
  enables Pro actions for Free; data isolation; theme parity.
- **Browser E2E (Playwright, desktop + mobile)** against a production build:
  public pages render with no CSP violations or script errors, the dashboard
  redirects when signed out, the API rejects anonymous calls, security headers
  are present, Clerk sign-in loads, tampered unsubscribe links are refused.
- **Accessibility:** vitest-axe on key components.
- **Evals** for the AI pipeline (§20.7) — tests check code, evals check quality.
- **CI** (`.github/workflows/ci.yml`, read-only token, SHA-pinned actions):
  lint → typecheck → tests → prod `npm audit` → build; the Python job runs
  `pip-audit` and pytest; the E2E job runs when Clerk test keys are set.
- **Why property tests?** Example tests check cases I thought of; properties
  check invariants across hundreds of generated inputs, which is where
  ranking and filtering bugs hide.

---

## 10. Performance and scalability

**Current:**
- Cached Mongo connection per warm lambda; `maxPoolSize: 10`.
- Indexes lead with `userId`; queries use `.lean()`.
- Engines run client-side with `useMemo`: no server cost and instant what-if.
- Static marketing pages prerendered; fonts self-hosted via `next/font`.
- **Load test** (`npm run load-test`, autocannon): one local production
  server, 100 concurrent connections → roughly 360–540 req/s per route, p99
  under 430 ms, 0 errors in about 25,600 requests. Be exact: that's public
  pages and the health check on a laptop, not database-heavy traffic.
- **Reminder cron** handles users 100 at a time (one Clerk lookup and one
  Resend batch call per 100) instead of two network calls per user.
- **AI work is off the request path:** saves respond first, and re-indexing
  runs in the background (`waitUntil`), only for the fields that changed.
- **Error monitoring:** Sentry on the app and the AI service.

**At 1M users, I'd change:**
1. **Pagination** on list endpoints (cursor on `{userId, createdAt}`) and
   server-side search, instead of fetching all of a user's jobs.
2. **Cron → queue:** fan out per-user work (QStash/SQS) with a cursor instead
   of one scan capped at 20,000 jobs.
3. **AI indexing → queue** with retries, instead of best-effort background
   calls plus a repair script.
4. **Cache plan lookups** in Redis (read on every gated request).
5. **Shard on `userId`** if one Atlas cluster saturates — the access pattern
   is already perfectly partitioned by user.

---

## 11. Frontend, UX, and accessibility

- **Design system:** CSS-variable tokens (light/dark) in `globals.css`,
  mirrored in `lib/theme-tokens.ts` for canvas charts; primitives in
  `components/ui` (Button variants, Card, Badge, Inputs, Modal, Drawer,
  Toast, Skeleton, EmptyState, ErrorState).
- **States:** every data view has skeleton, empty (one CTA), error (retry),
  and ready states via `<DataView>`.
- **Accessibility:** skip-to-content links, focus traps and focus restore in
  dialogs and drawers, labeled inputs, visible focus rings, status shown by
  text not just color, 44px touch targets, `prefers-reduced-motion`
  respected globally and in framer-motion.
- **Responsive:** sidebar becomes a drawer below 1024px; tables become cards
  below 768px.
- **Honest UI:** the landing preview runs the real engines; no invented
  logos, testimonials, or placeholder links; a factual `/privacy` page.
- **Redesign decisions:** asymmetric hero, a single accent instead of the
  purple "AI gradient", Geist type with tabular figures for numbers, press
  feedback on buttons, subtle grain texture.

---

## 12. Challenges I faced (STAR stories)

Use **Situation → Task → Action → Result**. Pick 2–3 that fit the question.

### 12.1 A billing bug that granted Pro for free
- **S:** The `customer.subscription.updated` handler mapped Stripe statuses
  through a lookup table that defaulted to `"active"`.
- **T:** Make sure only paying users get Pro.
- **A:** Unknown statuses (`incomplete`, `incomplete_expired`, `paused`) fell
  through to Pro. I extracted `planFromSubscriptionStatus()` as a pure
  function that fails closed (only `active`/`trialing` grant Pro) and
  unit-tested every branch.
- **R:** Billing can no longer unlock Pro on a status I didn't anticipate.
  Lesson: security-relevant defaults should deny.

### 12.2 An invisible call-to-action button
- **S:** The landing page's final "Get started" button rendered white on white.
- **A:** The primary variant applies `text-white`, and an override passed
  `text-indigo-700`. With Tailwind, *the order in the generated CSS* decides,
  not the order of the class names. I added a dedicated `inverse` variant
  instead of `!important` hacks.
- **R:** Fixed in both themes; the lesson is to model variants, not stack
  conflicting utilities.

### 12.3 Hydration mismatch from fonts
- **S:** Fonts loaded via a manual `<head>` link caused hydration warnings
  and a lint error.
- **A:** Moved to `next/font`, exposing CSS variables consumed by the design
  tokens.
- **R:** No mismatch, self-hosted fonts, no layout shift from late font swaps.

### 12.4 Making scores honest
- **S:** The job-fit breakdown showed "+39, +20, +10, +2, −31", with a total
  of 71 — the visible numbers didn't add up.
- **A:** The −31 is points *not earned*, not a deduction. I split the UI into
  "What helped" and "What held it back", so the earned items sum to the score.
- **R:** Explanations that survive an interviewer adding them up. Explainable
  is only valuable if it's accurate.

### 12.5 A security upgrade that broke the build
- **S:** The audit flagged critical CVEs in Next.js. The fix was only on the
  15.5 line, and 15.5 broke the type-check step.
- **A:** Traced it to a generated `.next/types/validator.ts` that resolves
  pages from `<root>/app` — wrong for this repo's `pages/` + `src/app/`
  layout. Excluded only that generated file; per-route type checks still run,
  and `tsc --noEmit` runs separately in CI.
- **R:** 0 critical vulnerabilities, green build. I document the workaround
  instead of hiding it.

### 12.6 Replacing a vulnerable dependency
- **S:** `xlsx` had unpatched prototype-pollution/ReDoS advisories and was
  used only to write a CSV.
- **A:** Wrote a 40-line RFC 4180 CSV writer with formula-injection
  protection, with tests.
- **R:** Removed the vulnerability, and the offers page JS dropped 275→188 kB.

### 12.7 Testing UI that jsdom can't render
- **S:** jsdom lacks `matchMedia`, `IntersectionObserver`, and
  `ResizeObserver`, which framer-motion and the theme rely on.
- **A:** Wrote controllable stubs in `test/setup.ts`, so tests can force
  dark mode or reduced motion.
- **R:** Theme and reduced-motion behavior became property-testable.

### 12.8 Serverless realities
- **S:** Cold starts can open a new DB connection per invocation, and
  in-memory rate limits don't work across lambdas.
- **A:** Cached the Mongoose connection on `globalThis`; used Upstash Redis
  for rate limiting and cron dedupe; made both env-gated so local dev works
  without them.
- **R:** Correct behavior across instances without extra infrastructure.

### 12.9 Signed-out visitors could see the dashboard
- **S:** The first Playwright test I wrote, "the dashboard is not reachable
  while signed out", failed: the dashboard layout rendered for a stranger.
- **T:** Find why route protection didn't protect.
- **A:** `middleware.ts` called `auth.protect()` without `await`. In Clerk v6
  it returns a promise, so the redirect was thrown into the void and the
  request continued. Added `await` and pointed the redirect at our own
  `/sign-in` instead of Clerk's hosted page.
- **R:** Data was never exposed, because every API route checks auth
  independently (defence in depth). Lesson: unit tests mocked the middleware
  away; only a real browser could see it. That's the argument for E2E tests.

### 12.10 Test files were deployed as public endpoints
- **S:** A production build failed with a cryptic minifier error.
- **A:** Patched Next's error wrapper to print the real error: it was minifying
  `pages/api/cron/follow-up-reminders.test.ts`. Next builds *every* file under
  `pages/` as a route, so seven test files had shipped as endpoints, one of
  them public (`/api/cron/...` is a public prefix). Moved route tests to
  `test/api/` at the same folder depth, and added a test that fails if a test
  file ever appears under `pages/` again.
- **R:** Smaller attack surface, a clean build, and a guard against regression.
  Lesson: framework conventions have security consequences.

### 12.11 Stripe events arriving out of order
- **S:** Stripe doesn't guarantee delivery order and retries for days. A late
  `checkout.session.completed` arriving after a cancellation would have
  restored Pro.
- **A:** Stopped trusting event payloads: every event re-fetches the
  subscription from Stripe and writes its *current* state; the plan is bound
  to one subscription id, so events about any other subscription are ignored.
  Also refused a second checkout for a Pro user.
- **R:** Webhook handling became idempotent and order-independent.

### 12.12 Turning AI off while an upload was in flight
- **S:** Opting out clears the consent flag and deletes the user's vectors.
  But a save made a second earlier could still be uploading, and would land
  *after* the delete.
- **A:** `indexWhileOptedIn()` re-reads consent after each index call returns;
  if consent is gone, it deletes exactly what it just wrote. Disable sets the
  flag *before* purging, and there is no "restore" on a failed purge.
- **R:** No path leaves a user's notes in Pinecone after they opt out.
  Lesson: consent is a distributed-systems problem, not a checkbox.

### 12.13 One filter that silently missed a job
- **S:** The Applied filter showed 0 results, though a job was clearly
  "Applied". The badge was also grey instead of blue.
- **A:** That old record stored `"Applied"` (capital A), saved before the
  schema enforced the lowercase enum; filters, badges and engines all match
  exact values. Made the schema lowercase/trim on save, normalised stages on
  the way out of the API, and wrote a preview-first migration script.
- **R:** Old data works without a migration, new data can't drift. Lesson:
  validate at the boundary *and* expect data written before the rule existed.

### 12.14 A cron job that couldn't scale past a few hundred users
- **S:** The daily digest did one Clerk lookup and one email call per user,
  sequentially — it would hit the 60-second function limit early.
- **A:** Batched: one `getUserList` and one Resend batch call per 100 users,
  dedupe claims in parallel on one Redis client.
- **R:** ~20 network calls per 1,000 users instead of ~2,000.

---

## 13. Limitations — the honest list

Volunteer these before the interviewer finds them. Each has a fix ready.

| # | Limitation | Impact | Fix |
|---|-----------|--------|-----|
| 1 | No pagination; search/filter is client-side | Fine at tens of jobs, slow at thousands | Cursor pagination plus server-side search |
| 2 | Deleting a job doesn't delete its notes | Orphaned notes keep a dangling `jobId` | Cascade delete or unlink |
| 3 | A note's `jobId` isn't checked to be yours | Can't leak data (notes are user-scoped), but allows a bad link | Verify job ownership on note create/update |
| 4 | Staleness uses `updatedAt` | Any edit resets the follow-up clock | Track a separate `lastContactAt` |
| 5 | Skill lexicon is 40 English terms | Misses niche skills | Expand; optional LLM extraction behind the same interface |
| 6 | Offer scores are relative | Adding an offer changes all scores | By design — explain it |
| 7 | Rate limiting fails open | A Redis outage removes limits | Trade-off; billing could fail closed |
| 8 | AI indexing is best-effort in the background | A failed upload leaves the index stale until the repair script runs | A queue with retries |
| 9 | AI service on a free tier sleeps | First prep after idle waits for a cold start (the app pings `/health` to wake it) | Paid instance |
| 10 | Eval set is 20 hand-written cases | Small; one author's labels | Grow it from real (consented) failure cases |
| 11 | Inline scripts allowed by the CSP | Weaker XSS protection than nonces | Nonce-based CSP (costs static rendering) |
| 12 | Mixed App Router + Pages Router | Two mental models | Migrate API to Route Handlers |
| 13 | Load test covers pages, not DB-heavy flows | Throughput under real usage unknown | Seeded staging DB + authenticated k6 scenarios |

---

## 14. What I'd do differently and the roadmap

**Differently:**
- Start with Route Handlers instead of mixing routers.
- Write the Playwright suite alongside the first feature, not after.
- Build webhook event ordering and idempotency in from day one.
- Put user scoping in a repository layer so an unscoped query can't be
  written.
- Define the data model before the UI — I deleted two early models
  (`Application`, `Company`) that were superseded by `Job` and never wired up.

**Roadmap:** run and publish the retrieval experiment (§20.7) → real users
and usage metrics (`npm run usage-report`) → pagination and server search →
queue-based AI indexing → CSV import → calendar/email integration →
team/coach sharing.

---

## 15. Question bank by category

### Motivation and product
- **Why this project?** §3.
- **Who are your users and how did you decide?** Three personas in the PRD;
  I designed around the 10–50-application candidate.
- **What's the one feature you're proudest of?** The explainable offer
  engine with the what-if simulator: it turns a stressful decision into a
  transparent one.
- **How is this different from a spreadsheet?** It acts on the data:
  ranked follow-ups, normalized offer comparison, health score, reminders.
- **How would you monetize/grow it?** Freemium: limit on tracked jobs,
  export as Pro. Growth through the public demo.

### Architecture and design
- **Walk me through the architecture.** §5.1, then a request lifecycle (§5.3).
- **Why run engines on the client?** The data is already loaded, the logic
  is pure, results must update instantly with sliders, and there's no server
  cost. Trade-off: logic ships in the bundle, which is fine because nothing
  is secret.
- **Why not Redux?** State is per-page server data plus two small contexts.
  I'd reach for TanStack Query before Redux.
- **How do you handle loading/empty/error states consistently?** One pure
  resolver plus `<DataView>`; property-tested to yield exactly one state.
- **Why two routers?** §6, last row.
- **How would you add a new engine?** Pure function in `lib/` returning
  score + reasons → unit and property tests → a hook or `useMemo` in the
  page → a card component.

### Backend and API
- **How do you validate input?** Required-field checks, ObjectId regex,
  field whitelist, Mongoose schema validators (`runValidators`), enum and
  length clamps on the profile.
- **What status codes do you return?** 400/401/403/404/405/429/500, with
  JSON errors.
- **How does the free-tier limit work?** Server counts jobs on POST, 403 at
  10, then re-counts after inserting and rolls back if a concurrent request
  also got through (§8); the client gate mirrors it for UX.
- **How does the cron avoid double emails?** Redis `SET NX EX`.

### Database
- **Why MongoDB?** §6. Per-user documents, flexible offer fields, no
  cross-user joins.
- **What indexes and why?** §5.5. All lead with `userId`.
- **How do you prevent duplicate plan records?** Unique index on `userId`
  plus upserts.
- **What happens when you delete a job?** Job only; notes remain (§13 #2).
  Its AI vectors are removed in the background.
- **What happens when a user deletes their account?** Stripe subscriptions
  are cancelled first, then every collection and the vectors are erased; a
  failure returns 500 so Clerk retries, and every step is idempotent.
- **N+1 queries?** None; each view is one query per collection.

### Auth and security
- **How do you stop user A reading user B's data?** §8 row 1, plus the
  property test.
- **What if someone calls your API without the UI?** Same checks: auth,
  scoping, validation, and rate limits live on the server.
- **Explain webhook signature verification.** Stripe signs the raw payload
  with a shared secret, and I recompute and compare the signature on the
  exact bytes. That's why the body parser is disabled.
- **What's CSV injection?** §8; spreadsheet apps execute cells starting
  with `=`.

### Billing
- **When exactly does a user become Pro?** Only on the signed
  `checkout.session.completed` webhook.
- **Duplicate webhooks?** Idempotent: each event re-reads the subscription
  and writes its current state.
- **Out-of-order webhooks?** Handled (§12.11): payloads aren't trusted, the
  current subscription is fetched, and the plan is bound to one subscription id.
- **Webhook never arrives?** Stripe retries for days. A success-page
  reconciliation via the session id could add safety.
- **Cancellation or failed payment?** `subscription.updated`/`deleted` →
  Free (`past_due` for payment failures).

### Frontend and React
- **How do you avoid hydration mismatches?** `next/font`; date-dependent
  engines aren't used in prerendered landing content; `suppressHydrationWarning`
  only on `<html>` for the theme class.
- **How does dark mode work?** `next-themes` toggles `.dark`; CSS variables
  switch; charts read resolved tokens.
- **Accessibility?** §11.
- **Performance?** §10.

### Algorithms and engines
- **Explain min-max normalization and its edge cases.** §7.1.
- **Why do scores change when I add an offer?** Relative by design.
- **How are follow-ups prioritized?** §7.5 formula.
- **How do you extract skills?** Lexicon + aliases + word boundaries; it's
  deterministic and explainable, but limited (§13 #8).
- **Complexity?** Offers: O(n·d) for n offers × 6 dimensions. Queue: O(n log n)
  for the sort. All trivially fast at user scale.

### Testing and DevOps
- **What do you test and how?** §9.
- **Example of a property you test?** "For any offers and weights, scores
  are within 0–100, sorted descending, and `isBest` marks exactly the max."
- **CI/CD?** GitHub Actions gates every push and PR; Vercel deploys from `main` once the project is connected.
- **How do you handle secrets?** Environment variables in Vercel; nothing in
  client bundles; `.env.example` documents them.

### Scalability and system design
- **What breaks first at scale?** Unpaginated list endpoints and the cron
  full scan. §10.
- **How would you add real-time updates?** Mostly unnecessary
  (single-user data). For multiple tabs: refetch on focus or SSE.
- **How would you add teams/sharing?** A workspace model, membership with
  roles, and `workspaceId` in every query instead of `userId` — the scoping
  pattern generalizes.

### AI and RAG
- **Walk me through the RAG pipeline.** §20.2.
- **How do you stop it hallucinating?** §20.4: the model must cite labelled
  sources; code drops anything it can't verify. Then measure it (§20.7).
- **How do you keep one user's notes out of another's answers?** §20.3.
- **Why a separate Python service?** §20.1.
- **How do you know it works?** §20.7 — quote your numbers.
- **How do you control cost?** §20.6.
- **What about prompt injection in a user's own notes?** The worst case is a
  user steering their own prep: retrieval is per-user, the model has no tools,
  output is schema-validated and rendered as text, and citations are checked
  in code.
- **Why not fine-tune?** The knowledge is per-user and changes daily;
  retrieval gives fresh, attributable answers without training anything.

### Behavioral
- **Hardest bug?** §12.11 (Stripe ordering), §12.12 (consent race), or §12.9
  (found by E2E).
- **A trade-off you made?** Fail-open rate limiting; relative scoring;
  client-side engines.
- **Something you'd do differently?** §14.
- **How did you prioritize?** PRD Must/Should list → core CRUD and security
  first → billing → intelligence → production hardening → polish.
- **How did you ensure quality working alone?** Tests including properties,
  CI gates, and reviewing my own diffs adversarially.

### Curveballs
- **Did you use AI tools?** Yes — and the commits say so. Answer honestly:
  which tools, for what, and how you checked the output (tests, an
  independent review pass, a security audit). Then prove understanding by
  walking through a file they pick. Practise this until any file in §16 is
  easy; this is the question that decides whether the project helps you.
- **How long did it take?** Give your real timeline.
- **Is it deployed? Any users?** Be exact, using `npm run usage-report`
  (totals only). Never claim users you don't have.
- **What would you cut if you had half the time?** Interview reflection and
  the cron digest; keep tracking, offers, billing, and security.

---

## 16. Code walkthrough map

"Show me…" → open this file.

| They ask about | Open |
|----------------|------|
| Auth wrapper | `lib/api-helpers.ts` |
| A full CRUD route | `pages/api/jobs/[id].ts` |
| Free-tier enforcement | `pages/api/jobs/index.ts` |
| Webhook verification | `pages/api/stripe/webhook.ts` |
| Plan logic | `lib/plans.ts`, `lib/plan-gate.ts` |
| Rate limiting | `lib/rate-limit.ts` |
| Cron + dedupe | `pages/api/cron/follow-up-reminders.ts` |
| DB connection | `lib/db.ts` |
| Offer engine | `lib/offer-intelligence.ts` |
| Job fit | `lib/career-fit.ts`, `lib/skills.ts` |
| Health score | `lib/career-health.ts` |
| Data hook | `hooks/useJobs.ts` |
| View states | `lib/view-state.ts`, `components/ui/DataView.tsx` |
| Property tests | `lib/scoring.property.test.ts`, `components/data-isolation.property.test.tsx` |
| Design tokens | `src/app/globals.css`, `lib/theme-tokens.ts` |
| Route protection | `middleware.ts` |
| CI | `.github/workflows/ci.yml` |
| AI routes (cap, consent, refund) | `pages/api/ai/prep.ts`, `pages/api/ai/enable.ts`, `lib/ai-usage.ts` |
| Background re-index + consent race | `lib/ai-sync.ts` |
| Per-user vector store | `ai-service/app/store.py` |
| Retrieval + citation guard | `ai-service/app/prep.py` |
| Evals and the sweep | `ai-service/evals/run.py`, `ai-service/evals/sweep.py` |
| Stripe ordering fix | `pages/api/stripe/webhook.ts` |
| Account erasure | `lib/account-deletion.ts` |
| Security headers / CSP | `next.config.mjs` |
| E2E tests | `e2e/public-pages.e2e.ts` |

---

## 17. Numbers to have ready

| Fact | Value |
|------|-------|
| Tests | ~430 app (Vitest) + 66 Python (pytest) + 8 Playwright tests × desktop/mobile |
| Engines | 6, all pure functions in `lib/` |
| API routes | 19 |
| Rate limits | 120 reads / 40 writes / 8 billing / 10 AI per minute per user |
| Free tier | 10 applications; export is Pro; Pro $9/mo; 5 AI preps/day for everyone |
| Load test | 100 concurrent connections, ~360–540 req/s per route, p99 < 430 ms, 0 errors (local) |
| Eval set | 20 cases over 8 jobs and 25 notes |
| Retrieval | `text-embedding-3-small` (1536-d), chunks 800/100, k = 6 per pass, two passes |
| Eval results | **Fill in after `python -m evals.sweep` and `python -m evals.run`** |
| Users | **Fill in from `npm run usage-report`** |

---

## 18. Things to avoid saying

- Claims about users, traction, or a live deployment you can't show.
- "It's secure" without the mechanism.
- "I used AI to build it" as a headline — or denying tool use. Be honest
  and show understanding.
- Hiding limitations. Volunteering one (§13) is the strongest seniority signal.
- Reading from this document during the interview. Know it; don't recite it.

---

## 19. One-page cheat sheet

- **Pitch:** tracker + six explainable engines + opt-in, cited RAG prep
  copilot with evals; webhook-only billing.
- **Motivation:** candidates lack decision support; scores you can audit; AI
  only where language helps.
- **Architecture:** Next.js UI + API routes → `withAuth` → user-scoped Mongo;
  pure engines client-side; Python RAG service behind a shared secret.
- **Best stories:** citation guard + evals (§20), consent race (§12.12),
  Stripe ordering (§12.11), auth bug found by E2E (§12.9).
- **Admit:** no pagination, best-effort AI indexing, small eval set, free-tier
  hosting (§13).
- **Close:** "Next I'd grow the eval set from real failures, move indexing to
  a queue, and add pagination."

---

## 20. AI Interview Prep Copilot — deep dive

### 20.1 What it does, and why a separate service
For one application, it reads that job's description plus the user's own
interview notes (from this and other jobs) and returns **likely questions,
weak spots, and a study plan — every item citing the note or description it
came from.** It runs as a FastAPI service in `ai-service/` because the
retrieval stack (LangChain, OpenAI, Pinecone) is Python-first, it isolates AI
latency and memory from the web app, and it can be scaled, deployed and
evaluated on its own. Next.js calls it server-to-server with a shared secret
(`X-AI-Service-Key`, compared with `hmac.compare_digest`); the service's API
docs are disabled because it's internal.

### 20.2 The pipeline
1. **Index** (on opt-in, and in the background on every save): job
   description, job notes and interview notes become *sources*; LangChain's
   `RecursiveCharacterTextSplitter` cuts them into 800-character chunks with
   100 overlap; OpenAI `text-embedding-3-small` embeds them; Pinecone stores
   them with metadata (`userId`, `jobId`, `sourceType`, `sourceId`, text).
   Only the fields that changed are re-embedded.
2. **Retrieve, two passes:** k = 6 chunks about *this job*, then k = 6 from
   the user's notes on *other* jobs — past interviews carry over (a system
   design round at one company predicts the next). Deduplicated, this job first.
3. **Generate:** chunks are labelled `[S1]…[Sn]`; the chat model (temperature
   0, structured JSON output, `max_tokens` 4000, 50 s timeout) must cite labels.
4. **Guard:** code maps labels back to retrieved chunks; unknown labels are
   dropped, items left without a citation are dropped (§20.4).
5. **Serve:** the Next.js route also drops citations to jobs that were deleted
   meanwhile, then the panel renders citations as links to the source.

### 20.3 Multi-tenancy: one user can never retrieve another's notes
All users share one Pinecone namespace (cheap, simple), so isolation is
enforced in code at **one choke point**: `UserStore` (`app/store.py`) is
constructed for a single user and adds a mandatory `userId` filter to every
query; nothing else talks to the index. Vector ids start with
`{userId}#{sourceType}#{sourceId}#`, so a user's vectors can be deleted by
prefix, and user ids containing `#` are rejected so one user's prefix can't
contain another's. Interview line: *"Isolation isn't a convention callers
must remember; it's the only API that exists."*

### 20.4 Hallucination control
Prompting "only use the sources" is not a guarantee, so the guarantee lives
in code (`apply_citation_guard`): the model can only cite labels it was given,
labels are normalised (`[S1]`, ` s1 `), anything unverifiable is removed, and
the model's own "insufficient data" flag is advisory: an answer with nothing
left after the guard is treated as insufficient. Then **measure** it:
citation validity should be 100% by construction, and an LLM judge scores
whether each item is actually supported by the text it cites (§20.7).

### 20.5 Consent and privacy
- Off by default; nothing is sent to OpenAI until the user opts in.
- Opt-out sets the flag **first**, then deletes the vectors; a background
  upload that lands after the purge is undone (§12.12). A failed purge never
  re-enables AI; Settings offers a retry.
- Account deletion erases the vectors too. Sentry never receives request
  bodies, so notes don't leak into error reports.

### 20.6 Cost and reliability
- **5 preps/day per user**, enforced atomically with a unique index on
  `{userId, date}` (concurrency-tested); a failed prep is refunded, except on
  a client timeout, because the model may still be generating (and billing).
- 10 prep requests/min rate limit; output-token and time caps; request size
  caps on the service.
- The free hosting tier sleeps, so the app pings `/health` to wake it and uses
  longer timeouts for background indexing.
- A reindex script rebuilds any user's vectors from MongoDB (isolated per
  user, so one failure doesn't stop the rest).

### 20.7 Evaluation — "how do you know it works?"
`ai-service/evals/`: 20 hand-labelled cases over a fixture user (8 jobs, 25
notes). For each case a human listed the sources that *should* be retrieved,
and whether the right answer is "not enough data".

| Metric | Question it answers |
|---|---|
| recall@k | Did retrieval find the sources that matter? |
| hit rate | Did it find at least one? |
| citation validity | Does every citation point at something retrieved? |
| groundedness (LLM judge) | Is each item supported by the text it cites? |
| insufficient-data accuracy | Does it decline exactly when it should? |

**The measured decision (your strongest AI story):**

| Run | recall@6 | hit | citations | grounded | "not enough data" |
|---|---|---|---|---|---|
| Baseline | 0.76 | 94% | 100% | 75% | 90% |
| + relevance floor | 0.74 | 94% | 100% | 75% | **100%** |

1. **Observe:** both failures were jobs with no data of their own; pass 2
   still sent 6 unrelated notes from other jobs, and the model used them.
2. **Diagnose:** I scored every retrieved chunk. Relevant cross-job notes sat
   at cosine 0.396–0.474; every chunk in the "not enough data" cases was
   ≤ 0.395.
3. **Change:** a floor of 0.40 on pass 2 only (`MIN_OTHER_NOTE_SCORE`).
4. **Measure:** "not enough data" 90% → 100%, and those cases no longer call
   the model at all. Cost: recall 0.76 → 0.74, because one relevant note at
   0.396 is now cut. I accepted that: a wrong answer is worse than a missing
   source.
5. **Be honest about limits:** 20 cases and single runs; the LLM judge moved
   individual cases by up to ±20 points between runs, so I treat small changes
   as noise. The threshold is tied to the embedding model. The fixtures are too
   short to compare chunk sizes, so `evals.sweep` needs longer fixtures first.

Also from the diagnosis: the top-ranked chunk is usually the job description,
because the query is "title at company" plus focus. A better query for pass 2
is the next experiment.

### 20.8 What I'd improve
Grow the eval set from real, consented failure cases; add a re-ranker and
test it against the same eval; queue-based indexing with retries; stream the
prep to the browser instead of waiting for the full answer.
