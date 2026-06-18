# TrackIQ — Implementation Plan

Phased plan. Status reflects the current codebase (see TRACKER.md for live state).

## Phase 0 — Foundation  ✅ Done
- Next.js 15 + TypeScript + Tailwind v4 setup.
- Clerk auth + middleware route protection.
- Cached Mongoose connection (`lib/db.ts`), `.env.example`.
- ESLint config (errors block build, style/type rules warn).

## Phase 1 — Data model & API  ✅ Done
- Models: `Job`, `Note`, `Offer`, `UserPlan`.
- `withAuth` wrapper + response helpers (`lib/api-helpers.ts`).
- CRUD routes for jobs, notes, offers — all user-scoped.
- `/api/user/plan`, `/api/health`.

## Phase 2 — Security & billing  ✅ Done
- Server-derived identity everywhere (no client `userId`).
- Stripe Checkout (no pre-payment upgrade), signature-verified webhook,
  server-side `UserPlan` updates, secure billing portal.
- Unified `free`/`pro` plan naming (`lib/plans.ts` client-safe + `lib/stripe.ts`).
- Free job limit enforced server-side; Pro gates in UI.

## Phase 3 — Core product flows  ✅ Done
- Jobs: CRUD, stages, search/filter/sort, edit + stepper.
- Notes: private, job-linked, rounds, CRUD.
- Offers: CRUD + weighted scoring engine + best-fit + explanation + CSV (Pro).

## Phase 4 — Analytics & intelligence  ✅ Done
- Dashboard KPIs, timeline, stage breakdown.
- Follow-up suggestion engine (`lib/insights.ts`).

## Phase 5 — UI/UX polish  ✅ Done
- Design-system primitives, dark mode, toasts, skeletons, empty/error states,
  responsive shell, SVG icons, motion.

## Phase 6 — Hardening  ✅ Done
- Removed dead stubs/duplicate models/junk deps.
- Graceful DB-down handling + health endpoint.
- `npm run build` passes cleanly.

## Phase 7 — Backlog / Next
- [ ] Automated tests (unit for scoring/insights; API integration).
- [ ] API rate limiting / abuse protection.
- [ ] Email reminders for follow-ups.
- [ ] Job-board import.
- [ ] "Database unavailable" global banner in dashboard shell.
- [ ] Server-route-based export (currently client-side).
- [ ] Consolidate or remove legacy `Application`/`Company` models.

## Definition of Done (v1)
Build passes · core flows work end-to-end · notes private · offers real &
comparable · Stripe secure · gates enforced · premium UI · no fake core features.
**Met — pending a live `MONGODB_URI` and Stripe keys at runtime.**
