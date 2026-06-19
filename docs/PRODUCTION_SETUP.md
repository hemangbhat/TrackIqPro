# TrackIQ — Production Setup

The code is production-ready. The remaining work is **configuration in external
dashboards** plus adding the matching environment variables in **Vercel →
Project → Settings → Environment Variables** (set them for **Production** and
**Preview**). After adding/changing env vars, **redeploy**.

Every integration below is **fail-safe**: if its env vars are absent the feature
no-ops (no crashes), so you can enable them one at a time.

---

## 1. MongoDB (required for real data)

1. Create a free cluster at MongoDB Atlas.
2. **Network Access** → add `0.0.0.0/0` (or Vercel's egress IPs) so the
   serverless functions can connect. This resolves the earlier "cluster DNS
   unreachable" issue.
3. **Database Access** → create a DB user + password.
4. Copy the SRV connection string and set:
   - `MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/trackiq?retryWrites=true&w=majority`
5. Redeploy. Verify by signing in and adding a job.

## 2. Clerk (auth + welcome email webhook)

Already working for auth. To enable the **welcome email**:

1. Clerk Dashboard → **Webhooks** → **Add Endpoint**.
2. Endpoint URL: `https://YOUR_DOMAIN/api/clerk/webhook`
3. Subscribe to the **`user.created`** event.
4. Copy the **Signing Secret** (starts `whsec_`) → set `CLERK_WEBHOOK_SECRET`.
5. Ensure these are set (already in use): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
   `CLERK_SECRET_KEY`.

## 3. Resend (transactional email)

1. Create a Resend account → **API Keys** → create one → set `RESEND_API_KEY`.
2. **Domains** → add and verify your sending domain (DNS records). Until
   verified you can test with the default `onboarding@resend.dev` sender.
3. Set `EMAIL_FROM="TrackIQ <noreply@your-domain.com>"`.
4. Set `NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN` (used for links in the email).
5. Test: register a new user → a welcome email should arrive. (If `RESEND_API_KEY`
   is unset, the webhook still returns 200 and simply skips sending.)

## 4. Stripe (billing)

1. Stripe Dashboard (live mode) → **Developers → API keys** →
   set `STRIPE_SECRET_KEY` (live `sk_live_…`).
2. **Products** → create the Pro product/price → copy the price id →
   set `STRIPE_PRICE_ID` (`price_…`).
3. **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted` (and any others the handler reads).
   - Copy the **Signing secret** → set `STRIPE_WEBHOOK_SECRET` (`whsec_…`).
4. Set the client key: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`).
5. Test: upgrade as a Free user → complete Stripe Checkout → confirm the webhook
   flips the plan to Pro in the dashboard and `UserPlan`.

## 5. Upstash Redis (rate limiting)

1. Create a free Upstash Redis database (global).
2. Copy the **REST URL** and **REST Token**:
   - `UPSTASH_REDIS_REST_URL=https://xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN=xxx`
3. Redeploy. API routes now enforce per-user/IP limits (mutation/billing/default
   tiers) and return `429` with `RateLimit-*` + `Retry-After` headers when
   exceeded. If these vars are unset, limiting is a transparent no-op.

## 6. Scheduled follow-up reminders (Vercel Cron)

A daily cron (`vercel.json`, 08:00 UTC) calls `/api/cron/follow-up-reminders`,
which emails each user a digest of their overdue follow-ups (using the existing
Priority Queue engine + Resend). Per-user dedupe via Upstash prevents repeats.

1. Generate a long random string and set **`CRON_SECRET`** in Vercel.
   Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>` to the
   cron path; the endpoint refuses to run without it (returns 401).
2. Requires `RESEND_API_KEY` (to send) — if unset, the job no-ops.
3. The schedule lives in `vercel.json` (`"0 8 * * *"`). Change the cron
   expression there for a different cadence (e.g. weekly `"0 8 * * 1"`).
4. Cron is enabled automatically on deploy (Vercel Hobby supports daily crons).

---

## Env var checklist (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | ✅ | Database |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Auth (client) |
| `CLERK_SECRET_KEY` | ✅ | Auth (server) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Links in emails |
| `STRIPE_SECRET_KEY` | ✅ (billing) | Stripe server |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ (billing) | Stripe client |
| `STRIPE_PRICE_ID` | ✅ (billing) | Pro price |
| `STRIPE_WEBHOOK_SECRET` | ✅ (billing) | Verify Stripe webhook |
| `CLERK_WEBHOOK_SECRET` | optional | Welcome email trigger |
| `RESEND_API_KEY` | optional | Send emails |
| `EMAIL_FROM` | optional | Sender identity |
| `UPSTASH_REDIS_REST_URL` | optional | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | optional | Rate limiting |
| `CRON_SECRET` | optional | Authorizes the follow-up reminder cron |

## Post-deploy smoke test

1. Visit `/` and `/demo` (public) → load without auth.
2. Sign up → land on `/dashboard` → welcome email arrives (if Resend configured).
3. Add a job, note, and offer → data persists (Mongo).
4. As Free user, hit the free job limit → upgrade prompt → Stripe Checkout →
   returns as Pro.
5. Manage billing → Stripe portal opens.
6. Hammer an API route past its limit → `429` (if Upstash configured).
