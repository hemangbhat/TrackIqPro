# TrackIQ — Product Requirements Document (PRD)

## 1. Overview
TrackIQ is a job-search command center that replaces scattered spreadsheets with
a single workspace. Candidates track applications through every stage, keep
private interview notes linked to each role, and compare competing offers with a
transparent weighted decision engine. A free tier covers casual searches; a Pro
subscription unlocks unlimited tracking, analytics, and data export.

## 2. Problem
Active job seekers juggle dozens of applications across email, spreadsheets, and
memory. They lose track of follow-ups, forget interview details, and make offer
decisions on gut feel. There is no lightweight, private, decision-support tool
built specifically for the candidate (not the recruiter).

## 3. Goals & Non-Goals
**Goals**
- Centralize application tracking with reliable CRUD and stage management.
- Keep private, organized interview notes tied to specific roles.
- Provide explainable offer comparison and a best-fit recommendation.
- Surface useful, actionable insights (follow-up nudges, conversion metrics).
- Monetize via a secure Stripe subscription with honest feature gating.

**Non-Goals**
- Not an ATS or recruiter tool.
- No job-board aggregation/scraping in v1.
- No team/multi-user collaboration in v1.

## 4. Target Users & Personas
- **Active candidate (primary):** running 10–50 applications, needs organization
  and follow-up reminders.
- **Senior candidate weighing multiple offers:** needs structured comparison.
- **Career switcher:** needs visibility into conversion rates and momentum.

## 5. User Stories
- As a user, I can sign up/sign in securely and only ever see my own data.
- As a user, I can create, view, edit, delete, search, filter, and sort job
  applications and move them through stages.
- As a user, I can write private notes linked to a job and interview round.
- As a user, I can add offers and compare them with adjustable priorities and a
  clear best-fit recommendation that explains itself.
- As a user, I can see analytics: totals, interview/offer rates, timeline,
  stage breakdown, and suggested follow-ups.
- As a user, I can upgrade to Pro via Stripe and manage billing.
- As a Pro user, I can export my data.

## 6. Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Email/social auth via Clerk; protected dashboard | Must |
| FR-2 | Jobs CRUD with 7 canonical stages and active/closed status | Must |
| FR-3 | Search, filter (stage), and sort (recent/company/salary) | Must |
| FR-4 | Private notes CRUD, scoped to user, linkable to job + round | Must |
| FR-5 | Offers CRUD persisted per user | Must |
| FR-6 | Weighted, set-normalized offer scoring + best-fit + explanation | Must |
| FR-7 | Analytics dashboard (KPIs, timeline, stage breakdown) | Must |
| FR-8 | Follow-up suggestion engine (staleness heuristic) | Should |
| FR-9 | Stripe Checkout, webhook-driven upgrades, billing portal | Must |
| FR-10 | Free/Pro gating: free job limit, Pro-only export | Must |
| FR-11 | Data export (JSON) for Pro users | Should |
| FR-12 | Light/dark theme | Should |

## 7. Free vs Pro
| Capability | Free | Pro |
|-----------|------|-----|
| Application tracking | Up to 10 | Unlimited |
| Interview notes | ✓ | ✓ |
| Offer comparison engine | ✓ | ✓ |
| Analytics dashboard | ✓ | ✓ |
| CSV / data export | — | ✓ |
| Priority support | — | ✓ |

Pricing: Free $0/mo, Pro $9/mo.

## 8. Non-Functional Requirements
- **Security:** all data user-isolated; identity derived server-side; webhook
  signatures verified; no secrets in client bundles.
- **Performance:** dashboard interactive < 2s on broadband; cached DB connection.
- **Accessibility:** labeled forms, keyboard focus states, color-independent
  status cues, `prefers-reduced-motion` respected.
- **Reliability:** graceful error/empty/loading states; health endpoint.
- **Responsiveness:** 375 / 768 / 1024 / 1440 breakpoints.

## 9. Success Metrics
- Activation: % of new users who add ≥3 applications in week 1.
- Retention: weekly active users.
- Conversion: free → Pro upgrade rate.
- Engagement: follow-up suggestions acted upon.

## 10. Release Scope (v1)
All "Must" requirements + FR-8, FR-11, FR-12. Future: reminders/email, job-board
import, mobile app, team workspaces.
