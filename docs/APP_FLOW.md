# TrackIQ — Application Flow

## 1. Route Map
| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Marketing landing (hero, features, CTA, demo link) |
| `/demo` | Public | Portfolio/Demo mode — full product with sample data, no account |
| `/pricing` | Public | Free vs Pro comparison + checkout CTA |
| `/sign-in/[[...rest]]`, `/sign-up/[[...rest]]` | Public | Clerk auth (catch-all routes; redirect to `/dashboard` after auth) |
| `/dashboard` | Protected | Overview: KPIs, charts, Career Health strip, follow-ups, recent activity |
| `/dashboard/intelligence` | Protected | Career Intelligence: Career Health, Job Fit, Priority Queue, Interview Reflection, Career Profile |
| `/dashboard/jobs` | Protected | Applications list + add modal + search/filter/sort |
| `/dashboard/jobs/[id]` | Protected | Edit application + stage stepper |
| `/dashboard/notes` | Protected | Notes grid + create/edit modal |
| `/dashboard/offers` | Protected | Offer comparison + Offer Intelligence (6-dim what-if) |
| `/dashboard/settings` | Protected | Account, subscription, data export |

## 2. Primary User Journeys

### 2.1 Onboarding
```
Landing → Sign up (Clerk catch-all /sign-up/[[...rest]])
→ signUpFallbackRedirectUrl → /dashboard
→ empty states prompt "Add your first application"
```

### 2.2 Track an application
```
/dashboard/jobs → "Add application" (modal)
→ POST /api/jobs (free limit checked server-side)
→ optimistic list update + success toast
→ edit via /dashboard/jobs/[id] → PUT /api/jobs/[id] → toast → back to list
```

### 2.3 Keep interview notes
```
/dashboard/notes → "New note" (modal: title, linked job, round, content)
→ POST /api/notes (scoped to userId)
→ card appears with round + job badges; edit/delete inline
```

### 2.4 Compare offers
```
/dashboard/offers → "Add offer" (modal: comp + growth/brand scores)
→ POST /api/offers
→ adjust priority sliders (weights) → scores recompute live
→ best-fit row badged; explanation shown; Pro can export CSV
```

### 2.5 Upgrade to Pro
```
/pricing or Settings → "Upgrade to Pro"
→ POST /api/stripe/checkout (userId from session) → Stripe Checkout
→ payment success → Stripe webhook → UserPlan = pro
→ /dashboard?upgrade=success → Pro features unlocked
→ Settings → "Manage billing" → Stripe Billing Portal
```

## 3. State Diagram — Application Stage
```
applied → screening → interview → offer → accepted
   │           │           │         │
   └───────────┴───────────┴─────────┴──► rejected / withdrawn
status: active ──► closed
```

## 4. Data Flow (per request)
```
Client component → hook (useJobs/useOffers) or fetch
→ /pages/api/* → withAuth → connectDB → Mongoose (filter by userId)
→ JSON → hook updates state → UI (loading/empty/error/success)
```

## 5. Async UI States (every data view)
- **Loading:** skeletons.
- **Empty:** illustrated empty state + primary CTA.
- **Error:** ErrorState card with retry (e.g., DB unreachable).
- **Success:** content + toast for mutations.

## 6. Auth Gate
```
Request → Clerk middleware (public matcher: /, /pricing, /sign-in(.*), /sign-up(.*), webhooks)
   ├─ public route → allow
   └─ protected → session? ─ yes → allow
                            └ no → redirect to sign-in
API → withAuth → userId? ─ no → 401
```
Clerk is configured in `src/app/layout.tsx` (`ClerkProvider` with `signInUrl`,
`signUpUrl`, and `signIn/signUpFallbackRedirectUrl="/dashboard"`). Both auth
pages use catch-all routes (`[[...rest]]`) with `routing="path"` so Clerk's
internal sub-steps (email verification, SSO callbacks) resolve correctly.
