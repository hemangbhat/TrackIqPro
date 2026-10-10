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

---

## 1. The 30-second pitch

> "TrackIQ is a full-stack SaaS for job seekers. It tracks applications, keeps
> private interview notes, and runs six deterministic, explainable engines over
> your pipeline — job fit, offer ranking with a what-if simulator, career
> health, a follow-up priority queue, and interview reflection. Every score
> shows its work, so you can see *why* an offer ranks first and what would
> change it.
>
> It's Next.js 15 and TypeScript on MongoDB, with Clerk auth, Stripe
> subscriptions where plans change only through verified webhooks, Upstash
> rate limiting, Resend email, and a Vercel cron for reminder digests. It has
> 260 tests including property-based tests, and CI runs lint, typecheck,
> tests, and a production build on every push."

Then stop and let them pick a thread. The pitch plants hooks (explainable
engines, webhook-only upgrades, property tests) that lead to your strongest
deep dives.

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
4. **Hardest part (40s).** Billing correctness (§12.1) or explainable
   normalized scoring (§7.1). Tell it as a story with a decision and a
   trade-off.
5. **Result (15s).** Built to deploy on Vercel (cron in `vercel.json`); 260
   tests; CI green on `main`; production hardening (rate limiting, signed
   webhooks, cron with dedupe). Only say "it's live" once your deployment is.

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

**Why "explainable" instead of AI?** A score you can't question is a score you
can't trust when the decision is your career. Deterministic engines are
auditable, testable with properties, free to run, and private — nothing is
sent to a third-party model.

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

 lib/  pure engines: scoring, offer-intelligence, career-fit, career-health,
       follow-up-intelligence, interview-reflection   (no I/O → unit-testable)
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
| Fake payment upgrade | Upgrade only via signed webhook; status mapping fails closed | `stripe/webhook.ts`, `lib/plans.ts` |
| Webhook forgery | Stripe signature on raw body; Svix for Clerk | webhook routes |
| Mass assignment | Job updates whitelist editable fields; `_id`/`userId` stripped elsewhere | `jobs/[id].ts` |
| Malformed input | ObjectId check → 400; profile input clamped and enum-checked | `[id]` routes, `career-profile.ts` |
| Abuse / brute force | Tiered Upstash rate limits per user | `lib/rate-limit.ts` |
| CSV / formula injection | Cells starting `= + - @` prefixed with `'` | `lib/csv.ts` |
| Secret leakage | Client-safe `lib/plans.ts` split from server `lib/stripe.ts`; error details hidden in production | |
| Unauthenticated cron | `CRON_SECRET` required; refuses to run if unset | cron route |
| Billing portal hijack | Customer id read from DB, never the client | `stripe/portal.ts` |
| Vulnerable dependencies | Next 15.5.27; 0 critical in prod audit; removed `xlsx` | `package.json` |

---

## 9. Testing and CI

- **260 tests across 36 files** — Vitest, Testing Library, jsdom.
- **Unit:** every engine, CSV, billing status mapping, ObjectId check, plan gate.
- **Property-based (fast-check, 38 assertions):** offer scores stay in 0–100,
  sorted, deterministic, `isBest` = argmax; filters return exactly the
  matching subset, and sort is a stable permutation; plan gate never enables
  Pro actions for Free; view-state yields exactly one state; light/dark
  token parity; reduced motion disables animation; data isolation; nav
  active-state.
- **Component and integration:** drawers (focus trap, Escape), job table,
  offer matrix including the export gate, pages, shell navigation, gated
  action → pricing flow.
- **Accessibility:** vitest-axe on key components.
- **CI** (`.github/workflows/ci.yml`): `npm ci` → lint → typecheck → test →
  build on every push to main and every PR.
- **Why property tests?** Example tests check cases I thought of; properties
  check invariants across hundreds of generated inputs, which is where
  ranking and filtering bugs hide.
- **Gap:** no browser E2E yet (see §13).

---

## 10. Performance and scalability

**Current:**
- Cached Mongo connection per warm lambda; `maxPoolSize: 10`.
- Indexes lead with `userId`; queries use `.lean()`.
- Engines run client-side with `useMemo`: no server cost and instant what-if.
- Removing `xlsx` cut the offers page's first-load JS from 275 kB to 188 kB.
- Fonts self-hosted via `next/font`; static marketing pages prerendered.

**At 1M users, I'd change:**
1. **Pagination** on list endpoints (cursor on `{userId, createdAt}`) and
   server-side search, instead of fetching all of a user's jobs.
2. **Cron → queue:** fan out per-user jobs (e.g. QStash/SQS) with a cursor,
   instead of one scan capped at 20,000 jobs.
3. **Cache plan lookups** in Redis (read on every gated request).
4. **Read replicas / sharding** on `userId` if one Atlas cluster saturates —
   the access pattern is already perfectly partitioned by user.
5. **Observability:** structured logs, error tracking, and webhook failure
   alerts.

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

---

## 13. Limitations — the honest list

Volunteer these before the interviewer finds them. Each has a fix ready.

| # | Limitation | Impact | Fix |
|---|-----------|--------|-----|
| 1 | No browser E2E tests | A broken flow could pass unit tests | Playwright against a seeded test DB in CI |
| 2 | Free-tier limit is count-then-insert | Two parallel requests could create job #11 | Transaction, or an atomic conditional counter |
| 3 | Stripe event ordering not tracked | A delayed older event could overwrite a newer status | Store last `event.created` per user and ignore older events |
| 4 | No pagination; search/filter is client-side | Fine at tens of jobs, slow at thousands | Cursor pagination plus server-side search |
| 5 | Deleting a job doesn't delete its notes | Orphaned notes keep a dangling `jobId` | Cascade delete or unlink, in a transaction |
| 6 | `jobId` on a note isn't checked to be yours | Can't leak data (notes are user-scoped), but allows a bad link | Verify job ownership on note create/update |
| 7 | Staleness uses `updatedAt` | Any edit resets the follow-up clock | Track a separate `lastContactAt` |
| 8 | Skill lexicon is 40 English terms | Misses niche skills and other phrasing | Expand the lexicon; optional LLM extraction behind the same interface |
| 9 | Offer scores are relative | Adding an offer changes all scores | By design — explain it; could add absolute benchmarks |
| 10 | Rate limiting fails open | A Redis outage removes limits | Acceptable trade-off; billing endpoints could fail closed |
| 11 | Cron scans up to 20,000 active jobs in one run | Doesn't scale | Queue-based fan-out with a cursor |
| 12 | Data isolation is in application code | One unscoped query = leak | Repository layer that requires `userId` |
| 13 | Mixed App Router + Pages Router | Two mental models | Migrate API to Route Handlers |
| 14 | Unused `Application` and `Company` models | Dead code | Delete them |
| 15 | 4 transitive vulnerabilities in Next.js | 0 critical, but not zero | Next 16 upgrade |
| 16 | No observability stack | Hard to debug production | Sentry + structured logs + webhook alerts |
| 17 | No data import (CSV/LinkedIn) | Onboarding friction | CSV import with column mapping |

---

## 14. What I'd do differently and the roadmap

**Differently:**
- Start with Route Handlers instead of mixing routers.
- Write the Playwright suite alongside the first feature, not after.
- Build webhook event ordering and idempotency in from day one.
- Put user scoping in a repository layer so an unscoped query can't be
  written.
- Define the data model before the UI — the two unused models are leftovers
  of changing direction.

**Roadmap:** E2E suite → pagination and server search → CSV import →
calendar/email integration for interview dates → optional LLM-assisted skill
extraction behind the existing engine interface → team/coach sharing →
mobile PWA.

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
  10; the client gate mirrors it for UX.
- **How does the cron avoid double emails?** Redis `SET NX EX`.

### Database
- **Why MongoDB?** §6. Per-user documents, flexible offer fields, no
  cross-user joins.
- **What indexes and why?** §5.5. All lead with `userId`.
- **How do you prevent duplicate plan records?** Unique index on `userId`
  plus upserts.
- **What happens when you delete a job?** Job only. Notes remain (§13 #5).
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
- **Duplicate webhooks?** Idempotent upserts.
- **Out-of-order webhooks?** Not handled yet (§13 #3).
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

### Behavioral
- **Hardest bug?** §12.1 or §12.4.
- **A trade-off you made?** Fail-open rate limiting; relative scoring;
  client-side engines.
- **Something you'd do differently?** §14.
- **How did you prioritize?** PRD Must/Should list → core CRUD and security
  first → billing → intelligence → production hardening → polish.
- **How did you ensure quality working alone?** Tests including properties,
  CI gates, and reviewing my own diffs adversarially.

### Curveballs
- **Did you use AI tools?** Answer honestly: say which tools, for what, and
  that you reviewed, tested, and can explain every line — then prove it by
  walking through a file.
- **How long did it take?** Give your real timeline.
- **Is it deployed? Any users?** Be exact. "It's deployable and CI-gated" is
  a fine answer; never claim users you don't have.
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

---

## 17. Numbers to have ready

| Fact | Value |
|------|-------|
| Tests | 260 across 36 files (38 property assertions, plus a11y) |
| Engines | 6, all pure functions in `lib/` |
| API routes | 14 |
| Rate limits | 120 reads / 40 writes / 8 billing per minute per user |
| Free tier | 10 applications; export is Pro; Pro $9/mo |
| Job stages | 7 (applied, screening, interview, offer, accepted, rejected, withdrawn) |
| Skill lexicon | 40 terms |
| Offer dimensions | 6 |
| Health metrics | 5 (25/25/20/15/15%) |
| Offers page JS | 275 kB → 188 kB after removing `xlsx` |
| Prod audit | 13 advisories (3 critical) → 4 (0 critical) |

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

- **Pitch:** tracker + six explainable engines; webhook-only billing; 260 tests.
- **Motivation:** candidates lack decision support; scores you can audit.
- **Architecture:** Next.js UI + API routes → `withAuth` → user-scoped Mongo;
  pure engines in `lib/` run client-side.
- **Best stories:** fail-closed billing (§12.1), honest scores (§12.4),
  normalization (§7.1).
- **Admit:** no E2E, count-then-insert race, webhook ordering, no pagination.
- **Close:** "Next week I'd add Playwright E2E, webhook ordering, pagination,
  and move the API to Route Handlers."
