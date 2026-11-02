# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Active job seekers running a search across many applications at once. They are
mid-search: juggling stages, interview rounds, follow-ups and, at the end,
competing offers. Their job is to stay organized and to make the offer decision
with evidence instead of gut feel or a spreadsheet.

## Product Purpose

TrackIQ is a job-search command center. It tracks applications across seven
stages, keeps private interview notes linked to each application and round, and
turns the pipeline into decisions through explainable scoring. Success means the
seeker always knows what to do next and can say why one role or offer beats
another.

## Positioning

Every score shows its work. Six deterministic, pure-TypeScript engines (Offer
Intelligence, Job Fit, Career Health, Follow-up Priority Queue, Interview
Reflection, plus the offer comparison) break each number into signed
contributions — what helped and what held it back — with a what-if simulator and
a concrete "path to #1" for every runner-up offer. No black box.

## Operating Context

- Seekers log roles (company, stage, salary, links), move them through stages,
  write round-by-round notes, and compare offers across six weighted dimensions.
- A daily follow-up email digest ranks stale applications.
- An opt-in AI Interview Prep Copilot (separate Python RAG service) builds cited
  prep from the job description and the user's own notes; off until enabled in
  Settings, 5 preps/day.
- A public demo at `/demo` runs on sample data with no sign-up.

## Capabilities and Constraints

- Next.js 15 App Router, Tailwind v4, Framer Motion, next-themes (light/dark),
  Clerk auth, Stripe billing, Chart.js.
- Plans: Free (up to 10 applications, `FREE_JOB_LIMIT`) and Pro (unlimited,
  CSV export, gated features). Plan changes happen only via verified Stripe
  webhooks.
- Strict CSP: scripts/styles/fonts must stay self-hosted or allowlisted.
- Tests assert landing/pricing behavior and accessibility (vitest-axe); e2e
  checks public pages for CSP violations.

## Brand Commitments

- Name: TrackIQ.
- Voice: plain, confident, honest. Claims are verifiable engineering facts.

## Evidence on Hand

- Real engine output on sample data (`components/landing/HeroPreview.tsx`
  computes the hero with the real Job Fit and Offer engines).
- Screenshots in `docs/screenshots/`.
- Engineering facts: 6 engines, user-isolated data, webhook-verified billing,
  a large automated test suite.
- No customer logos, testimonials, user counts or press exist. Never fabricate
  them.

## Product Principles

1. Explain, don't assert: a number without its reasons is not shipped.
2. Decisions over data: every surface should point to the next action.
3. Private by default: notes and AI features are the user's alone, opt-in.
4. Honest proof only: show the real engine, never invented social proof.

## Accessibility & Inclusion

Labeled controls, visible focus, status not conveyed by color alone, reduced
motion honored, usable down to 375px, both light and dark themes.
