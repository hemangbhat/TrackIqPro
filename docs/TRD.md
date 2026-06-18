# TrackIQ — Technical Requirements Document (TRD)

## 1. Stack
- **Framework:** Next.js 15 (App Router for UI in `src/app`, Pages Router for API in `pages/api`).
- **Language:** TypeScript (strict).
- **Styling:** Tailwind CSS v4 (class-based dark mode via `@custom-variant`), CSS variables for theming.
- **Auth:** Clerk (`@clerk/nextjs`) + edge middleware route protection.
- **Database:** MongoDB Atlas via Mongoose 8 (cached serverless connection).
- **Billing:** Stripe (Checkout, Billing Portal, signature-verified webhooks).
- **Charts:** Chart.js + react-chartjs-2.
- **Animation:** Framer Motion.
- **Spreadsheet export:** SheetJS (`xlsx`).

## 2. High-Level Architecture
```
Browser (App Router pages, client components)
        │  fetch()
        ▼
/pages/api/*  ── withAuth (Clerk getAuth) ── lib/db.connectDB ── Mongoose models ── MongoDB
        │
        └── /api/stripe/* ── Stripe SDK ── (webhook → UserPlan)
Clerk middleware protects all non-public routes.
```

## 3. Directory Structure
```
src/app/**            App Router UI (landing, dashboard, pricing, auth)
pages/api/**          REST API routes (jobs, notes, offers, stripe, user, health)
models/**             Mongoose schemas (Job, Offer, Note, UserPlan, Company, Application)
lib/**                db, api-helpers, scoring, insights, plans (client-safe), stripe (server)
hooks/**              useJobs, useOffers (data hooks)
components/**         UI shell + components
components/ui/**      Design-system primitives (Button, Card, Modal, Toast, icons, …)
types/**              Shared TypeScript interfaces
```

## 4. Authentication & Authorization
- Clerk `clerkMiddleware` + `createRouteMatcher`. Public routes: `/`, `/sign-in`,
  `/sign-up`, `/pricing`, `/api/health`, `/api/stripe/webhook`. Everything else
  requires a session.
- API routes use `withAuth(handler)` which calls `getAuth(req)`; returns 401 if
  no `userId`. The authenticated `userId` is injected on the request — **never**
  read from the request body.
- Every query is filtered by `userId`; updates/deletes use `{ _id, userId }`.

## 5. API Surface
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET/POST | `/api/jobs` | ✓ | List / create jobs (free limit enforced on POST) |
| GET/PUT/PATCH/DELETE | `/api/jobs/[id]` | ✓ | Single job ops |
| GET/POST | `/api/notes` | ✓ | List (optional `?jobId=`) / create notes |
| GET/PUT/PATCH/DELETE | `/api/notes/[id]` | ✓ | Single note ops |
| GET/POST | `/api/offers` | ✓ | List / create offers |
| GET/PUT/PATCH/DELETE | `/api/offers/[id]` | ✓ | Single offer ops |
| POST | `/api/stripe/checkout` | ✓ | Create Checkout session (no upgrade here) |
| POST | `/api/stripe/portal` | ✓ | Billing portal (customerId resolved server-side) |
| POST | `/api/stripe/webhook` | public + signature | Apply plan changes after payment |
| GET | `/api/user/plan` | ✓ | Current plan/status |
| GET | `/api/health` | public | DB connectivity probe |

Response conventions via `lib/api-helpers`: `successResponse`, `errorResponse`
(includes `details` only in development), `methodNotAllowed`.

## 6. Billing Flow (security-critical)
1. Client calls `POST /api/stripe/checkout`; server derives `userId` from Clerk,
   creates a Checkout session with `metadata.userId` on both session and
   subscription. **No plan change occurs here.**
2. Stripe redirects to hosted Checkout. On success Stripe calls the webhook.
3. Webhook verifies signature, then on `checkout.session.completed` /
   `customer.subscription.updated` / `.deleted` updates `UserPlan` server-side.
4. Portal resolves the Stripe `customerId` from the user's own record.
5. Gating: server enforces the free job limit; UI reflects `plan`.

## 7. Offer Scoring Engine (`lib/scoring.ts`)
- Factors: cash (base+bonus+signing), equity, growth (0–10), brand (0–10).
- Weights normalized to sum 1. Each factor min-max normalized **across the set**,
  weighted, summed → 0–100 fit score. Top score flagged `isBest`.
- `scoreExplanation(weights)` returns a human-readable description.

## 8. Insights Engine (`lib/insights.ts`)
- Staleness heuristic per stage threshold (applied 10d, screening/interview 5d,
  offer 2d). Produces ranked follow-up suggestions with severity.

## 9. Configuration / Env
`MONGODB_URI`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. See `.env.example`.

## 10. Error Handling & Observability
- DB connection cached; failures surface as 500/503 with friendly UI error states
  and a retry. `/api/health` reports `ok` / `degraded`.
- Client hooks expose `{ loading, error, retry }`; pages render Skeleton / Empty /
  Error states.

## 11. Build & Deploy
- `npm run build` must pass (lint warnings allowed, errors not). Deploy on Vercel;
  set env vars; register Stripe webhook at `/api/stripe/webhook`.

## 12. Constraints / Tech Debt
- Export is client-side (gated in UI by plan).
- No automated tests or rate limiting yet.
- `Company`/`Application` models exist but are not part of the v1 UI flow.
