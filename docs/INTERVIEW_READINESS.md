# TrackIQ — Interview Readiness

**Verdict: the code is interview-ready. The demo becomes interview-ready once
the five steps under "Before the interview" below are done.**

How to present the project is in [`INTERVIEW_GUIDE.md`](INTERVIEW_GUIDE.md).
This document answers a narrower question: *if an interviewer opens the repo
or asks for a live demo today, what holds up and what doesn't?*

Last verified: 2026-10-10, on `main`.

---

## 1. Scorecard (verified, with evidence)

| Area | Status | Evidence |
|------|--------|----------|
| Builds cleanly | Ready | `npm run build` passes; GitHub Actions CI green on `main` |
| Lint / types | Ready | `npm run lint` clean; `npm run typecheck` (tests included) clean |
| Tests | Ready | 260 tests / 36 files passing, incl. 38 fast-check property assertions and vitest-axe checks |
| CI | Ready | `.github/workflows/ci.yml` runs lint, typecheck, tests, build on push/PR |
| Feature completeness | Ready | All PRD "Must" items plus Career Intelligence (6 engines), demo mode, email, cron |
| Security posture | Ready | Server-derived identity, user-scoped queries, signed Stripe/Svix webhooks, fail-closed plan mapping, ObjectId validation, update whitelist, CSV-injection guard, rate limiting |
| Dependencies | Ready, with a known item | Prod audit: 0 critical. 4 remain (2 high, 2 moderate), all transitive under Next.js; clearing them needs the Next 16 major upgrade |
| UI / UX | Ready | Redesigned landing, light/dark, mobile-responsive, honest content, 404 + privacy pages, skip links |
| Honesty | Ready | No invented users, logos, testimonials, or placeholder links |
| Docs | Ready | README, PRD, TRD, schema, design, production setup, interview guide |
| Live deployment | **Not verified** | Requires your MongoDB, Clerk, and Stripe keys in Vercel; see §2 |
| Browser E2E tests | Gap (documented) | No Playwright suite yet; answer prepared in the guide |

---

## 2. Before the interview (only you can do these)

These need your accounts and credentials, so they couldn't be done from the
repo. Do them at least a day before.

1. **Deploy and smoke-test.** Set every variable from `.env.example` in Vercel
   (`docs/PRODUCTION_SETUP.md` walks through it). `STRIPE_PRICE_ID` is now
   required — checkout returns "Billing is not configured" without it. Then
   click through: sign up → add job → add note → add two offers → export (as
   Pro).
2. **Use Stripe test mode for the demo.** Card `4242 4242 4242 4242`. Confirm
   the plan flips to Pro only after the webhook arrives (check the Stripe
   dashboard's webhook log — that's a great thing to show live).
3. **Prepare two accounts.** One Free account sitting at 9 jobs (so you can
   show the 10-job limit in one click), one Pro account with ~8 jobs, notes,
   and 3 offers so the dashboard and intelligence pages look alive.
4. **Have a fallback.** If the live site or your network fails, `/demo` runs
   entirely on bundled sample data with no backend. Also keep the repo open
   locally (`npm run dev`).
5. **Add the live URL and 2–3 screenshots to the README.** Interviewers often
   open the repo before the call; a link and a screenshot at the top earns
   attention in the first ten seconds.

---

## 3. Rehearsal checklist

- [ ] Say the 30-second pitch (guide §1) out loud without notes, three times.
- [ ] Run the 5-minute demo script (guide §4) end to end against the live site.
- [ ] Explain on a whiteboard: request → middleware → `withAuth` → scoped query.
- [ ] Walk through `pages/api/stripe/webhook.ts` and `lib/plans.ts` line by line.
- [ ] Explain min-max normalization in `lib/offer-intelligence.ts`, including the
      `max === min` edge case and why scores are relative.
- [ ] Answer each question in the guide's question bank (§15) in under 60 seconds, and tell two STAR stories from §12.
- [ ] Name the known gaps (guide §13: E2E, free-tier race, webhook ordering, pagination) and the
      fix for each — before the interviewer finds them.
- [ ] Open any file the interviewer points at and explain it. If there's a
      file you can't explain yet, read it until you can.

---

## 4. Questions that could still catch you out

| If they ask… | Weak spot | Your answer |
|---|---|---|
| "Show me your E2E tests." | None exist | "Unit, integration, property and a11y tests cover logic and UI; the next layer is Playwright against a seeded DB — here's how I'd structure it." |
| "Two requests at once — can a free user get 11 jobs?" | Yes, count-then-insert race | "Yes. I'd fix it with a transaction or a conditional atomic counter." |
| "What if Stripe events arrive out of order?" | Not handled | "Updates are idempotent, but a stale event could win. Store the last `event.created` per user and ignore older ones." |
| "Why mix App Router and Pages Router?" | Looks inconsistent | "Pages API routes give the raw body for webhook signature checks simply; Route Handlers with `req.text()` are the migration path." |
| "Why does `tsconfig` exclude `.next/types/validator.ts`?" | Looks like a hack | "Next 15.5 generates that file with wrong paths for a root `pages/` + `src/app/` layout. Per-route type checks still run; the upgrade was needed for a critical CVE." |
| "Why are 4 vulnerabilities still open?" | Audit not clean | "All transitive inside Next.js; clearing them needs Next 16. Zero critical, none in code paths I control." |

---

## 5. Bottom line

The engineering is solid and well-evidenced: tests, CI, real security
decisions, and stories with trade-offs. What turns that into a convincing
interview is a working live demo and your ability to explain any file on
request. Finish §2, rehearse §3, and you're ready.
