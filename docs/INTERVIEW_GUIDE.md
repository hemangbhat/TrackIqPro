# TrackIQ — Technical Interview Guide

How to present this project so an interviewer leaves convinced you built it,
understand it, and can reason about its trade-offs. Everything here is true of
the code in this repo — if you say it, you can point to the file.

---

## 1. The 30-second pitch (memorize this)

> "TrackIQ is a full-stack SaaS for job seekers. It tracks applications, keeps
> private interview notes, and — the interesting part — runs six deterministic,
> explainable scoring engines over your pipeline: job fit, offer ranking with a
> what-if simulator, career health, a follow-up priority queue, and interview
> reflection. Every score ships its reasoning, so you can see *why* an offer
> ranks first and what would change it.
>
> It's Next.js 15 and TypeScript on MongoDB, with Clerk auth, Stripe
> subscriptions where plans change only through verified webhooks, Upstash rate
> limiting, Resend email, and a Vercel cron for reminder digests. It has 260
> tests including property-based tests, and CI runs lint, typecheck, tests, and
> a production build on every push."

Then **stop and let them pick a thread.** The pitch is designed to plant hooks
(explainable engines, webhook-only upgrades, property tests) that lead to the
deep dives below — topics where you are strongest.

---

## 2. The 2-minute walkthrough (when they say "tell me about a project")

Use **Problem → Solution → Architecture → Hardest part → Result**.

1. **Problem (15s).** Candidates juggle 10–50 applications in spreadsheets,
   forget follow-ups, and pick offers on gut feel. Existing tools are built
   for recruiters, not candidates.
2. **Solution (20s).** A private workspace: tracker + notes + an offer decision
   engine. The differentiator is *explainability* — not "AI says 71", but
   "+39 for skill coverage, +20 title match, held back by 4 missing skills".
3. **Architecture (30s).** App Router for UI, Pages Router API routes, Mongoose
   models, every route wrapped in `withAuth` so identity comes from the Clerk
   session — never the request. Scoring engines are pure TypeScript functions
   in `lib/`, shared by the dashboard, the public demo, and the landing page.
4. **Hardest part (40s).** Pick one: billing correctness (§5.2) or
   explainable normalized scoring (§5.4). Tell it as a story with a decision
   and a trade-off.
5. **Result (15s).** Deployed on Vercel; 260 tests; CI green; production
   hardening (rate limiting, signed webhooks, cron with dedupe).

---

## 3. Live demo script (5 minutes)

Open these in tabs **before** the interview. Never demo from a cold start.

| Step | Where | What to show | What to say |
|------|-------|--------------|-------------|
| 1 | `/` | Hero preview | "These numbers aren't mockups — the landing page imports the same engines and runs them on the demo dataset." |
| 2 | `/demo` | Career Health, Priority Queue, Job Fit cards | "Each card shows *what helped* and *what reduced* the score. No black box." |
| 3 | `/demo` → Offer Intelligence | Drag a weight slider | "The ranking re-orders live; arrows show movement, and every runner-up gets a concrete path to #1." |
| 4 | `/dashboard/jobs` | Add a job, change stage, search/filter | "Full CRUD; the API scopes every query by the session's `userId`." |
| 5 | Free account at 10 jobs | Try to add an 11th | "The client gate is advisory; the server returns 403 and the UI maps that back to the upgrade prompt. The server is the source of truth." |
| 6 | `/dashboard/offers` | Click Export as free user | Upgrade prompt. "Export is Pro-only, enforced on both sides." |
| 7 | Settings / Pricing | Upgrade (Stripe test card `4242…`) | "Checkout does **not** upgrade the user. Only the signed `checkout.session.completed` webhook does." |
| 8 | Toggle theme, resize to mobile | — | "Tokens in CSS variables, mirrored in TS for charts; a property test checks both themes stay in parity." |

**If something breaks live:** say what you'd check ("the API returned X, so
I'd look at the Clerk session first") — debugging calmly is a signal too.

---

## 4. Architecture (draw this on the whiteboard)

```
 Browser (React client components, framer-motion, Chart.js)
   │  fetch('/api/jobs')  — no user id in the request
   ▼
 Vercel Edge ── middleware.ts (clerkMiddleware: protect non-public routes)
   │
   ▼
 pages/api/*  ──► withAuth()  → userId from Clerk session (getAuth)
                  enforceRateLimit()  → Upstash sliding window (per user)
                  connectDB()   → cached Mongoose connection on globalThis
                  Model.find({ userId, ... })  → every query user-scoped
   │
   ├─ /api/stripe/checkout  → creates session, metadata.userId, NO upgrade
   ├─ /api/stripe/webhook   → raw body + signature verify → UserPlan update
   ├─ /api/clerk/webhook    → Svix verify → welcome email (Resend)
   └─ /api/cron/follow-up-reminders  ← Vercel Cron, Bearer CRON_SECRET,
                                        Redis SET NX EX dedupe per user
 lib/  pure engines: scoring, offer-intelligence, career-fit, career-health,
       follow-up-intelligence, interview-reflection  (no I/O → unit-testable)
```

**Why both routers?** App Router for the UI (layouts, server components where
useful); Pages Router for API routes because Stripe/Svix webhook verification
needs the *raw* request body, which `export const config = { api: { bodyParser:
false } }` gives directly. Migration path: Route Handlers with `await
req.text()` — be ready to say you know that's the modern option.

---

## 5. Deep dives — the stories that convince

Each one: **what → why → trade-off**. Interviewers reward the trade-off.

### 5.1 Data isolation (security)
- **What:** `withAuth` (`lib/api-helpers.ts`) derives `userId` from the Clerk
  session; every query is `{ _id: id, userId }` — so another user's id returns
  404, not their data. Compound indexes `{ userId, createdAt }` etc. back it.
- **Proof:** `components/data-isolation.property.test.tsx` injects arbitrary
  ids/emails/tokens into localStorage, cookies, and the URL, and asserts no
  hook ever uses them to scope a request.
- **Trade-off:** Isolation lives in application code, not the database. At
  scale I'd add a repository layer that makes an unscoped query impossible to
  write, or use per-tenant DB permissions.

### 5.2 Billing correctness (the best story)
- **Rule:** the user is upgraded **only** by a verified webhook — never at
  checkout creation, because a user can create a session and abandon payment.
- Webhook verifies `stripe-signature` against the **raw** body; `userId` lives
  in both session and subscription metadata, so every event type resolves it.
- Status mapping is a pure function, `planFromSubscriptionStatus`
  (`lib/plans.ts`), that **fails closed**: only `active`/`trialing` grant Pro.
  *(I found and fixed a bug where unknown statuses like `incomplete` defaulted
  to Pro — a good "how I found a bug in my own code" story.)*
- Billing portal resolves the Stripe customer from the server record, never
  from client input.
- **Trade-offs to volunteer:** no event-id idempotency store yet (updates are
  idempotent upserts, so replays are harmless, but out-of-order delivery could
  briefly apply a stale status — fix: store `event.created` and ignore older
  events).

### 5.3 Free vs Pro gating
- Server is authoritative (`POST /api/jobs` returns 403 at 10 jobs for free).
  The client gate (`lib/plan-gate.ts`) is pure and *advisory* — it only
  decides what to *offer*; `interpretServerRejection` maps a 403/402 back to
  the right upgrade prompt.
- **Trade-off:** count-then-insert is a race (two parallel requests could
  create job #11). Fix: a transaction, or an atomic per-user counter with a
  conditional `$inc`.

### 5.4 Explainable, normalized scoring (the "thinking" story)
- Offers are scored per dimension, **min-max normalized across the user's own
  offer set** (best = 100), then combined with user weights that are
  normalized to sum to 1 (`lib/offer-intelligence.ts`, `lib/scoring.ts`).
- **Why relative, not absolute?** "$180k" isn't good or bad in a vacuum; it's
  good *relative to your alternatives*. Normalization also makes salary
  (dollars) and growth (1–10) comparable.
- **Edge case:** all offers equal on a dimension → `max === min` → everyone
  gets full marks instead of dividing by zero.
- **Known consequence:** adding/removing an offer changes everyone's score —
  scores are rankings, not grades. Say this before they do.
- Job fit (`lib/career-fit.ts`) is a transparent point model: skill coverage
  up to 70, role alignment up to 20, seniority ±10, bonus skills up to +5.
  "What held it back" shows points *not earned*, separately from what was
  earned.
- **Why not ML/LLM?** Determinism: same input, same answer; testable with
  properties; explainable to the user; zero inference cost. An LLM could
  enrich skill extraction later, but scoring should stay auditable.

### 5.5 Serverless realities
- **DB connections:** Mongoose connection cached on `globalThis` (`lib/db.ts`)
  so warm lambdas reuse it instead of exhausting Atlas's connection limit.
- **Rate limiting:** in-memory counters don't work across lambda instances,
  so it's Upstash Redis with sliding windows, tiered (reads 120/min, writes
  40/min, billing 8/min). It **fails open** — a Redis outage shouldn't take
  down the API. *Trade-off:* for billing endpoints you could argue fail-closed.
- **Cron:** Vercel Cron hits a `CRON_SECRET`-protected route; per-user dedupe
  with Redis `SET key NX EX 72000` so retries never double-email.
- **Env-gated features:** rate limiting and email no-op when keys are missing,
  so local dev never breaks.

### 5.6 Testing strategy
- **260 tests / 36 files** (Vitest + Testing Library).
- **Property-based tests (fast-check)** for invariants, not examples: scores
  stay in 0–100 and the best offer is always ranked #1; filters never return
  items that don't match; plan-gate decisions are consistent; light/dark theme
  tokens stay in parity; reduced-motion always disables animation.
- **Accessibility:** vitest-axe checks on key components; labeled forms, focus
  trap in modals/drawers, color-independent status.
- **CI:** `.github/workflows/ci.yml` — lint, typecheck, test, build on every PR.
- **Gap to admit:** no browser E2E (Playwright) against a seeded DB yet —
  that's the next layer.

### 5.7 Small things that show seniority
- **CSV injection:** export prefixes cells starting with `= + - @` so a company
  named `=HYPERLINK(...)` can't execute in Excel (`lib/csv.ts`). Also removed
  the `xlsx` dependency (unpatched advisories) — offers page JS dropped
  275 kB → 188 kB.
- **Mass assignment:** job updates whitelist editable fields; `userId`/`_id`
  can never be rewritten.
- **Input validation:** malformed ObjectIds return 400 instead of a 500
  CastError.
- **Client/server split:** `lib/plans.ts` holds client-safe constants so no
  server module (or secret) leaks into the client bundle.

---

## 6. Questions you will get — crisp answers

**"How do you make sure users can't see each other's data?"**
Identity is server-derived from the Clerk session, and every query includes
`userId`. Requesting someone else's id returns 404. A property test fuzzes
client-side identity sources to prove hooks never use them.

**"What happens if a Stripe webhook is delivered twice?"**
Plan updates are upserts to the same final state, so replays are idempotent.
Out-of-order delivery is the real risk; I'd store the last applied
`event.created` per user and drop older events.

**"What if the webhook never arrives?"**
User paid but isn't Pro. Stripe retries for days; for belt-and-braces, the
success page could call an endpoint that fetches the session from Stripe by id
and reconciles. Never trust the redirect alone.

**"How would you scale this to 1M users?"**
Indexes already lead with `userId`. Next: move the cron from a full scan to a
queue (per-user jobs, paginated cursor), cache plan lookups in Redis, and
shard or partition by `userId` if a single Atlas cluster becomes the limit.
The engines are pure and run client-side or per-request, so they scale with
compute, not the database.

**"Why MongoDB over Postgres?"**
Per-user documents with flexible fields (offers with optional equity/bonus,
notes) and no cross-user joins — a document store fits. The cost: no FK
constraints (job ↔ note links are enforced in app code) and the free-tier
count race needs a transaction. For heavy cross-entity reporting I'd pick
Postgres.

**"Why is your scoring not AI?"**
Deliberately deterministic: explainable, testable with properties, free to
run, and users can trust a number they can audit.

**"What was the hardest bug?"**
Tell one real one in STAR format. Options from this repo: the white-on-white
CTA (Tailwind utility conflict between `text-white` in the variant and
`text-indigo-700` in the override — CSS order, not class order, decides; fixed
with an `inverse` variant); the fail-open Stripe status mapping; hydration
mismatches from fonts loaded via a manual `<head>` link (moved to `next/font`).

**"What would you do differently?"**
Start with Route Handlers instead of mixing routers; write the Playwright E2E
suite earlier; add webhook event ordering from day one; put isolation in a
repository layer so an unscoped query can't be written.

**"How do you handle errors?"**
API routes return consistent JSON errors (details only outside production);
hooks surface `error` state; every data view has loading, empty, and error
states with retry; toasts instead of `alert()`.

---

## 7. Numbers to have ready

| Fact | Value |
|------|-------|
| Tests | 260 across 36 files (incl. property-based + a11y) |
| Scoring engines | 6, all pure functions in `lib/` |
| API routes | 14 (jobs, notes, offers, profile, plan, stripe ×3, clerk webhook, cron, health) |
| Rate limits | 120 reads / 40 writes / 8 billing per minute per user |
| Free tier | 10 applications; export is Pro |
| Offers page JS | 275 kB → 188 kB after removing `xlsx` |
| Prod dependency audit | 13 advisories (3 critical) → 4 (0 critical) |

---

## 8. Things to avoid saying

- Don't claim users or traction you don't have. The landing page was cleaned of
  invented logos and testimonials for this reason — interviewers check.
- Don't say "it's secure" without the mechanism. Say "identity is
  server-derived and every query is user-scoped."
- Don't say "I used AI to build it" as the headline. If asked, be honest about
  tools, then show you understand every line — walk through a file.
- Don't hide trade-offs. Volunteering one (normalization makes scores
  relative; free-tier race) is the strongest signal of seniority.

---

## 9. One-page cheat sheet

- **Pitch:** tracker + six explainable engines; webhook-only billing; 260 tests.
- **Best stories:** billing correctness (§5.2), normalized scoring (§5.4).
- **Admit:** no E2E yet, count-then-insert race, webhook ordering.
- **Close:** "If I had another week: Playwright E2E on a seeded DB, webhook
  event ordering, and moving API routes to Route Handlers."
