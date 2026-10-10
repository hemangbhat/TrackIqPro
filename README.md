# TrackIQ

A full-stack SaaS job-search command center. Track applications through every
stage, keep private interview notes linked to each role, and compare offers with
a weighted decision engine — wrapped in a polished, responsive dashboard with
dark mode and Stripe-powered subscriptions.

## Features

- **Application tracker** — full CRUD with stage tracking, search, filter, and sort.
- **Interview notes** — private, user-scoped notes linked to an application and round.
- **Offer decision engine** — weighted, set-normalized scoring (0–100) across your
  real offers with a best-fit recommendation and a transparent explanation.
- **Analytics dashboard** — KPI cards, an applications timeline, and a stage breakdown.
- **Billing** — Stripe Checkout + webhooks, server-enforced free/pro gating, and a
  customer billing portal.
- **Polished UX** — light/dark mode, toasts, skeleton loaders, empty states,
  accessible forms, and an SVG icon system.

## Quality

- 260 tests (Vitest, Testing Library, fast-check property tests, vitest-axe).
- GitHub Actions CI runs lint, typecheck, tests, and a production build.
- Presenting this project? See [`docs/INTERVIEW_GUIDE.md`](docs/INTERVIEW_GUIDE.md) and the readiness checklist in [`docs/INTERVIEW_READINESS.md`](docs/INTERVIEW_READINESS.md).

## Tech stack

- **Next.js 15.5** (App Router for UI, Pages Router for API routes)
- **TypeScript**, **Tailwind CSS v4**
- **MongoDB** + **Mongoose**
- **Clerk** for authentication
- **Stripe** for subscriptions
- **Chart.js** for analytics

## Architecture

- `src/app/**` — App Router pages (landing, dashboard, pricing, auth).
- `pages/api/**` — REST API routes. Every data route is authenticated with Clerk
  via `withAuth` and scoped to the signed-in user.
- `models/**` — Mongoose schemas (`Job`, `Offer`, `Note`, `UserPlan`, …).
- `lib/**` — DB connection, auth helpers, the scoring engine, and plan utilities.
- `hooks/**` — reusable data hooks (`useJobs`, `useOffers`).
- `components/ui/**` — design-system primitives (Button, Card, Modal, Toast, …).

Security highlights: all reads/writes are user-isolated, Stripe webhooks are
signature-verified, plan upgrades happen **only** after a successful payment
webhook (never at checkout creation), and the billing portal resolves the
customer ID from the server-side record rather than client input.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your keys:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   |----------|-------------|
   | `MONGODB_URI` | MongoDB connection string |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth keys |
   | `STRIPE_SECRET_KEY` | Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint |
   | `STRIPE_PRICE_ID` | Price ID of the Pro subscription |

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Stripe webhooks (local)

Forward events to the local webhook handler:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed signing secret as `STRIPE_WEBHOOK_SECRET`.

## Deployment (Vercel)

1. Push to GitHub and import the repo into Vercel.
2. Add all environment variables from `.env.example` in the Vercel project settings.
3. Add a Stripe webhook endpoint pointing at
   `https://<your-domain>/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`.
4. Deploy. `npm run build` runs cleanly with no lint or type errors.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the project |
| `npm run typecheck` | Type-check the whole project, tests included |
| `npm test` | Run the test suite |
