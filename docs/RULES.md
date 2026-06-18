# TrackIQ — Engineering Rules & Conventions

## 1. Security (non-negotiable)
- **Never trust client input for identity.** Derive `userId` from Clerk via
  `getAuth`/`withAuth`. Never read `userId`, `customerId`, or `plan` from the body.
- Every data query filters by `userId`. Mutations use `{ _id, userId }`.
- Protect routes in `middleware.ts`. Only explicitly public routes are open.
- Verify Stripe webhook signatures. **Never** grant entitlements before the
  webhook confirms payment.
- Never log or return secrets. `errorResponse` exposes `details` only in dev.
- Keep server-only modules (Mongoose models, `lib/stripe`, `lib/db`) out of client
  components. Client-safe constants live in `lib/plans.ts`.

## 2. Plan / billing
- Plan vocabulary is exactly `free` | `pro`. No other strings.
- Entitlement source of truth is `UserPlan`, updated only by the webhook (or
  server code), never by the client.
- Gate Pro features in the UI **and** enforce limits server-side where applicable
  (e.g., free job limit).

## 3. Data & API
- One model per concept; `Job` is the canonical application record.
- All API routes: `connectDB()` → auth → validate → operate → typed response.
- Use `lib/api-helpers` (`successResponse`, `errorResponse`, `methodNotAllowed`).
- Validate required fields; return 400 with a clear message.
- Return 401 (unauth), 404 (not found/owned), 405 (method), 500/503 (server/db).

## 4. TypeScript
- `strict` on. Avoid `any`; prefer `unknown` + narrowing or shared types from
  `types/index.ts`. Remaining `any` must be justified and is lint-warned.
- Hooks return `{ data, loading, error, refetch, …mutations }`.

## 5. UI/UX
- Use `components/ui` primitives; don't hand-roll buttons/inputs/cards.
- Every async view handles **loading / empty / error / success**.
- Mutations show a toast; never use `alert()`.
- Icons are SVG (`components/ui/icons.tsx`); no emoji as UI icons.
- All interactive elements: `cursor-pointer`, focus-visible ring, hover feedback.
- Theme via CSS variables + `dark:`; verify both modes. Honor reduced motion.
- Forms: every input has a label; dialogs are `aria-modal` and Escape-closable.

## 6. Code organization
- Reuse hooks/utilities; extract repeated logic (`useJobs`, `useOffers`,
  `lib/scoring`, `lib/insights`).
- No dead files, empty stubs, or unused imports.
- Keep components focused; colocate page-specific UI under its route.

## 7. Git / process
- Small, focused commits; never commit `.env*` (only `.env.example`).
- `npm run build` must pass before merge (no errors; warnings acceptable).
- Don't introduce dependencies casually; pin and justify.

## 8. Error handling
- Fail gracefully: user-facing copy is friendly; technical detail is dev-only.
- Network/DB failures render `ErrorState` with retry, not a blank screen.

## 9. Definition of Done (per feature)
- Wired end-to-end UI → API → DB, user-scoped.
- States covered; typed; build green; gated if premium; no fake data.
