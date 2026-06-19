# TrackIQ — Progress Tracker

Legend: ✅ done · � partial · ⬜ not started

## Build & Quality
| Item | Status | Notes |
|------|--------|-------|
| `npm run build` passes | ✅ | Exit 0, no errors/warnings |
| Automated tests | ✅ | 233 tests / 33 files passing (vitest + fast-check) |
| No dead files / empty stubs | ✅ | Removed ~15 stubs |
| Typed code, no blocking `any` | ✅ | Remaining `any` are warnings |
| No console spam | ✅ | DB logs trimmed |

## Career Intelligence Layer (explainable, tested)
| Item | Status | Notes |
|------|--------|-------|
| Job Fit Score (skills/role/seniority) | ✅ | `lib/career-fit.ts` — score + strong/missing/learning + what-helped/reduced |
| Offer Intelligence (6 dimensions) | ✅ | `lib/offer-intelligence.ts` — overall fit + rationale |
| What-if simulator (live re-rank) | ✅ | `simulateWhatIf` + sliders + ▲/▼ movement |
| Career Health score + grade | ✅ | `lib/career-health.ts` — 5 weighted metrics + recommendations |
| Follow-up Priority Queue | ✅ | `lib/follow-up-intelligence.ts` — value-ranked, explained |
| Interview Reflection assistant | ✅ | `lib/interview-reflection.ts` — strengths/weaknesses/mistakes + confidence trend |
| Career Profile persistence | ✅ | `CareerProfile` model + `/api/career-profile` + `useCareerProfile` |
| Career Intelligence page + dashboard strip | ✅ | `/dashboard/intelligence` + homepage widgets |
| Portfolio / Demo mode | ✅ | Public `/demo` with realistic sample data |
| Explainable (no black-box) | ✅ | Every score ships its reasoning |
| Engine unit tests | ✅ | 17 tests in `lib/career-intelligence.test.ts` |

## Premium UI Redesign (Stitch)
| Item | Status | Notes |
|------|--------|-------|
| Deep-navy glass dark theme + indigo accent | ✅ | Tokens in globals.css + theme-tokens.ts |
| Geist / Inter / JetBrains Mono (next/font) | ✅ | Fixed hydration + font lint warning |
| Glass utilities (panel, gradient-border, cta) | ✅ | globals.css |
| All 8 surfaces redesigned | ✅ | Landing, Dashboard, Jobs, Job Details, Offers, Notes, Pricing, Settings |
| Pricing FAQ accordion + footer nav (new) | ✅ | Working interactive features |
| Stitch reference HTML cached | ✅ | `.stitch-ref/` |

## Auth & Security
| Item | Status | Notes |
|------|--------|-------|
| Clerk auth + protected routes | ✅ | Middleware matcher; catch-all sign-in/up |
| Server-derived identity | ✅ | `withAuth`, never client userId |
| User-isolated reads/writes | ✅ | jobs, notes, offers |
| Webhook signature verification | ✅ | Stripe webhook |
| No secrets in client bundle | ✅ | `lib/plans` split from `lib/stripe` |

## Jobs
| Item | Status |
|------|--------|
| CRUD | ✅ |
| Consistent stage enum | ✅ |
| Edit saves correctly | ✅ |
| Search / filter / sort | ✅ |
| Loading / empty / error states | ✅ |

## Notes
| Item | Status |
|------|--------|
| Private + user-scoped | ✅ |
| Linked to job + round | ✅ |
| CRUD + validation | ✅ |
| Search | ✅ |

## Offers
| Item | Status |
|------|--------|
| DB-backed CRUD | ✅ |
| No hardcoded demo data | ✅ |
| Weighted scoring (configurable) | ✅ |
| Best-fit highlight + explanation | ✅ |
| CSV export (Pro-gated) | ✅ |

## Billing
| Item | Status |
|------|--------|
| Stripe Checkout | ✅ |
| No pre-payment upgrade | ✅ |
| Webhook-driven plan updates | ✅ |
| Billing portal (server-resolved customer) | ✅ |
| Consistent plan naming (`free`/`pro`) | ✅ |
| Free/Pro gating (client + server) | ✅ |

## Analytics & Intelligence
| Item | Status |
|------|--------|
| KPI cards | ✅ |
| Timeline + stage breakdown charts | ✅ |
| Follow-up suggestion engine | ✅ |

## UI/UX
| Item | Status |
|------|--------|
| Dark mode (working) | ✅ |
| Toasts (no alert) | ✅ |
| Skeletons | ✅ |
| Empty + error states | ✅ |
| Responsive | ✅ |
| Accessible forms/labels | ✅ |

## Settings
| Item | Status |
|------|--------|
| Profile | ✅ |
| Plan status | ✅ |
| Billing controls | ✅ |
| Theme toggle | ✅ (topbar) |
| Data export (Pro) | ✅ |

## Production Hardening
| Item | Status | Notes |
|------|--------|-------|
| Rate limiting (Upstash, env-gated) | ✅ | `lib/rate-limit.ts`; mutation/billing/default tiers; no-op without env |
| Transactional email (Resend, env-gated) | ✅ | `lib/email.ts` + welcome template; no-op without env |
| Welcome email on registration | ✅ | Svix-verified Clerk webhook `/api/clerk/webhook` |
| Scheduled follow-up reminder emails | ✅ | Daily Vercel cron `/api/cron/follow-up-reminders` (CRON_SECRET-secured, Upstash dedupe) |
| Lint warnings cleared | ✅ | Unused imports/directives removed |
| Next.js security patch | ✅ | Pinned 15.4.11 |
| Production setup guide | ✅ | `docs/PRODUCTION_SETUP.md` |

## Known Blockers / Follow-ups
| Item | Status | Owner |
|------|--------|-------|
| `MONGODB_URI` reachable in Vercel | 🟡 | User (see PRODUCTION_SETUP.md) |
| Stripe live keys + webhook registered | 🟡 | User (see PRODUCTION_SETUP.md) |
| Resend domain verified + keys in Vercel | 🟡 | User (optional; enables email) |
| Upstash Redis keys in Vercel | 🟡 | User (optional; enables rate limiting) |
| Email follow-up reminders (scheduled) | ✅ | Daily Vercel cron + digest email |
