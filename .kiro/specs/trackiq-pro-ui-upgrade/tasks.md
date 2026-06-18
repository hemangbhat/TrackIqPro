# Implementation Plan: TrackIQ Pro UI Upgrade

## Overview

This plan implements a presentation-layer upgrade for TrackIQ Pro across eight surfaces (Landing, Dashboard, Jobs, Job Details, Offers, Notes, Pricing/Billing, Settings). All work is in TypeScript/React on the existing Next.js App Router + Tailwind stack. The existing REST API, Mongoose models, scoring/insights engines, auth/middleware, Stripe billing, and the `ThemeProvider`/CSS-variable theming engine are consumed unchanged.

The approach is incremental: first extend the shared UI kit and theming tokens, then the shells, then each page surface (each building on the kit and shells), wiring data through the existing hooks plus a new `useNotes` hook that mirrors the established data-access pattern without changing any API contract. Property-based tests (fast-check) validate the design's seven correctness properties; unit/integration tests cover examples and edge cases. Test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Establish shared UI primitives, tokens, and test scaffolding
  - [x] 1.1 Formalize design tokens and theme-token fallback utility
    - Verify/define the CSS-variable tokens (`--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--accent`) for light and `.dark` in `globals.css`
    - Add a token-resolution helper that returns the light-theme value as a fallback when a token is missing/unresolved, used by chart color derivation and surfaces
    - Apply indigo accent to primary buttons, active nav, focus rings, and primary chart series
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 1.2 Set up the component test framework and fast-check
    - Configure the test runner (e.g., Vitest + React Testing Library) and add `fast-check` as a dev dependency for property-based tests
    - Add a render helper that wraps components in `ThemeProvider` and supports forcing light/dark and `prefers-reduced-motion`
    - _Requirements: 2.2, 16.3_

  - [x] 1.3 Add the Drawer primitive (focus trap, Escape-to-close, scroll lock)
    - Extend the existing `Modal` focus-trap/backdrop logic into a side-sheet `Drawer` in `components/ui`; `role="dialog"`, `aria-modal`, `backdrop-blur-sm`
    - Restore focus to the triggering element on close; lock body scroll while open
    - _Requirements: 1.6, 1.7, 1.8, 15.3, 15.4_

  - [x] 1.4 Write unit tests for Drawer accessibility behavior
    - Test focus trap (Tab/Shift+Tab cycle), Escape closes and restores focus, body scroll lock toggles
    - _Requirements: 15.3, 15.4_

  - [x] 1.5 Extend the SVG icon set and shared state primitives
    - Add missing SVG icons (search, filter, sort, sliders, export) to `components/ui/icons.tsx`; no emoji
    - Confirm `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, `Field`/`Label` primitives expose the props the pages need (icon, copy, single CTA, retry handler, `aria-describedby`)
    - _Requirements: 3.1, 3.2, 3.3, 5.4, 5.5, 15.1, 15.9_

- [x] 2. Build the application shells and navigation chrome
  - [x] 2.1 Implement MarketingShell (public chrome)
    - Sticky topbar (logo, nav anchors, theme toggle, sign-in CTA, "Get started" CTA) and footer; no sidebar; no auth dependency
    - Topbar fixed to top with content scrolling beneath
    - _Requirements: 1.1, 1.3_

  - [x] 2.2 Refine DashboardShell (protected chrome)
    - Fixed `w-64` sidebar with `lg:pl-64` content offset on `lg+`; sticky `h-14` topbar with PlanBadge, quick-add, theme toggle, Clerk `UserButton`
    - Below `lg`: hide sidebar, show keyboard-and-pointer operable drawer-trigger that opens the slide-in Drawer
    - Render exactly one active nav item (indigo-filled) matching the current route via `usePathname()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.9_

  - [x] 2.3 Write property test for navigation correctness
    - **Property 6: Navigation correctness**
    - For any route, exactly one nav item is active and it matches the route; public routes render MarketingShell and protected routes render DashboardShell
    - **Validates: Requirements 1.1, 1.2, 1.9**

  - [x] 2.4 Write unit tests for shell responsive/drawer behavior
    - Test sidebar visible and content offset at >=1024px; drawer-trigger present below 1024px; drawer opens on activation and closes on Escape returning focus to the trigger
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 3. Implement shared data-view state handling and the Plan_Gate
  - [x] 3.1 Implement a reusable view-state resolver for data views
    - Derive exactly one of {loading, empty, error, ready} from a Data_Hook's loading/error/data; wire skeleton (layout-matching), empty (one icon + copy + one CTA), error (message + single retry bound to `fetch*`, preserving prior data), and ready states
    - Retry transitions to loading and re-invokes the hook's fetch function
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Write property test for state coverage
    - **Property 2: State coverage**
    - For any combination of loading/error/data inputs, the resolver yields exactly one view state; gated views additionally resolve to {gated, allowed}
    - **Validates: Requirements 3.6, 4.1, 4.2, 4.3, 4.4**

  - [x] 3.3 Implement Plan_Gate helper and gated-action wiring
    - Centralize gating using `lib/plans.isPro` and `FREE_JOB_LIMIT`: disable export for Free_User with upgrade prompt, disable job-create submit at/over the free limit with inline upgrade prompt, enable both for Pro_User
    - Treat the server response as authoritative; on server rejection show the matching upgrade prompt within 1s and retain user-entered data without resubmitting
    - Upgrade prompt selection navigates to `/pricing` within 1s
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 3.4 Write property test for gating consistency
    - **Property 3: Gating consistency**
    - For any plan and job count, the UI never enables a Pro-only action (export, jobs beyond `FREE_JOB_LIMIT`) for a Free_User; the gate mirrors server enforcement
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 4. Checkpoint - shells, tokens, and shared state utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement theme-aware, accessible charts
  - [x] 5.1 Make StatusBreakdown and ApplicationsChart theme-aware
    - Read resolved theme/CSS variables to set tick, grid, axis, and label colors; primary series uses the indigo accent plus the status-tone palette; update within 500ms of theme change
    - Distinguish each series by a non-color attribute (direct label, pattern, or shape marker) and meet contrast (labels/ticks 4.5:1, grid/axis 3:1)
    - _Requirements: 14.1, 14.2, 14.4, 6.2_

  - [x] 5.2 Add accessible chart summaries and reduced-motion handling
    - Pair each chart with a programmatically associated text summary stating data values and trend, exposed to assistive tech
    - When `prefers-reduced-motion` is set, render charts in final state with animation duration zero for initial render and updates
    - _Requirements: 14.3, 14.5_

  - [x] 5.3 Write property test for reduced motion
    - **Property 7: Reduced motion**
    - For any chart/animation surface, when `prefers-reduced-motion: reduce` is set no non-essential animation runs (duration resolves to ~0)
    - **Validates: Requirements 14.5, 16.3**

  - [x] 5.4 Write unit tests for chart theme switching and summaries
    - Test tick/grid/label colors switch on theme change; verify each chart has an associated text summary and a non-color series distinction
    - _Requirements: 14.1, 14.3, 14.4_

- [x] 6. Add the useNotes data hook
  - [x] 6.1 Implement hooks/useNotes mirroring useJobs/useOffers
    - Expose `notes`, `loading`, `error`, `fetchNotes(jobId?)`, `createNote`, `updateNote`, `deleteNote` against the existing `/api/notes` (incl. `?jobId=`) without changing the API contract
    - _Requirements: 11.2, 17.3_

  - [x] 6.2 Write unit tests for useNotes
    - Test fetch/create/update/delete state transitions and optional `jobId` filter; assert no user-identifying value is read client-side to scope queries
    - _Requirements: 11.2, 17.1, 17.2_

- [x] 7. Implement the Landing page (MarketingShell)
  - [x] 7.1 Build Landing sections and navigation CTAs
    - Hero (headline, subcopy, primary "Get started", secondary "See pricing"); then feature grid (>=3 features), how-it-works, pricing preview, social proof (>=1 testimonial), closing CTA, footer in top-to-bottom order
    - All icons are SVG (no emoji); "Get started" navigates to sign-up, pricing preview / "See pricing" navigate to `/pricing`
    - On navigation failure, remain on landing and show an error message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 7.2 Write unit tests for Landing structure and navigation
    - Test section presence/order, SVG-only icons, CTA navigation targets, and navigation-failure messaging
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

- [x] 8. Implement the Dashboard page
  - [x] 8.1 Build KPI row, charts, and insight lists
    - Four StatCards (total apps, interview rate 0–100%, offers, active) with non-negative integer/percentage values; StatusBreakdown + ApplicationsChart from Insights_Engine; recent-activity list and follow-up list (<=5, most urgent first) from Insights_Engine
    - Free_User upsell card; plan badge reflecting Free or Pro
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7_

  - [x] 8.2 Wire Dashboard loading/empty/error states
    - Use the view-state resolver: empty shows zero-valued stat cards plus empty-state in place of charts/lists; error shows a load-failure indication retaining layout without stale/partial values
    - _Requirements: 6.4, 6.5_

  - [x] 8.3 Write unit tests for Dashboard states and KPI derivation
    - Test KPI value bounds, Insights_Engine-sourced charts/lists, empty/error rendering, upsell for free users, and plan badge
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9. Checkpoint - charts, notes hook, landing, and dashboard
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Jobs list, filtering, and sorting
  - [x] 10.1 Build JobsToolbar and client-side filter/sort logic
    - Toolbar with debounced search input, stage filter chips, sort control, and current result count
    - Compute via `useMemo` over the `useJobs()` array: case-insensitive substring search across title/company/location; stage filter over the stage set (or all); sort reorders the visible set preserving the same item set; show all when search empty
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.2 Write property test for filter/sort integrity
    - **Property 4 (companion): filter+sort stability**
    - For any jobs array, query, and stage, filter+sort never adds/removes items beyond the predicate and ordering is a stable permutation of the matches
    - **Validates: Requirements 7.2, 7.5**

  - [x] 10.3 Build JobTable/JobCard hybrid with states and row actions
    - Dense table at >=768px, stacked cards below 768px; stage Badge; open navigates to details; edit opens the form drawer; delete invokes `useJobs` mutation and shows the updated list
    - No-results empty state with result count 0 when search+filter match nothing; on edit/delete mutation failure show an error identifying the operation and preserve the existing list
    - _Requirements: 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [x] 10.4 Write unit tests for Jobs table responsiveness and mutation errors
    - Test table/card breakpoint switch, no-results state, and edit/delete failure handling preserving the list
    - _Requirements: 7.6, 7.7, 7.8, 7.11_

- [x] 11. Implement Job creation and editing drawer
  - [x] 11.1 Build JobFormDrawer with validation and plan gating
    - Labeled fields (title, company, location, stage, status, salary, link, description, notes) with title/company/stage/status required; create defaults stage="applied", status="active"; every input programmatically associated with a visible label
    - Validate: title/company >=1 non-whitespace char, stage in set, status in {active, closed}, salary (if provided) >= 0; invalid submit blocks mutation, keeps drawer open with values, focuses first invalid input, and shows per-field messages via `aria-describedby`
    - On valid submit invoke the `useJobs` mutation; success closes drawer with auto-dismiss success toast (<=5s); failure keeps drawer open with values and shows an error toast
    - When at/over `FREE_JOB_LIMIT` and not Pro, show inline upgrade prompt and disabled submit (via Plan_Gate)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 4.2, 15.1, 15.8_

  - [x] 11.2 Write unit tests for JobFormDrawer validation and gating
    - Test required/format validation, value retention on failure, focus-to-first-invalid, success/error toast paths, and free-limit gating branch
    - _Requirements: 8.3, 8.5, 8.6, 8.7, 4.2, 15.8_

- [x] 12. Implement Job Details page
  - [x] 12.1 Build the six detail panels and stage stepper
    - JobHeader, StageStepper, MetadataPanel, NotesPanel (notes via `?jobId=` with empty-state when none), FollowUpPanel, RelatedOffers
    - Stage stepper change invokes `useJobs` update with the new stage; on update failure retain prior stage and show an error
    - _Requirements: 9.1, 9.2, 9.3, 9.6_

  - [x] 12.2 Wire edit/delete with confirmation and not-found handling
    - Edit and delete actions; delete requires explicit confirmation, then invokes `useJobs` delete and navigates away
    - If the job does not exist/cannot be retrieved, show a load error and do not render the six panels
    - _Requirements: 9.4, 9.5, 9.7_

  - [x] 12.3 Write unit tests for Job Details panels and actions
    - Test panel rendering, linked-notes empty state, stage-update failure rollback, delete confirmation + navigation, and not-found error
    - _Requirements: 9.3, 9.5, 9.6, 9.7_

- [x] 13. Checkpoint - jobs surfaces complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Offers comparison and scoring
  - [x] 14.1 Build OfferMatrix, WeightSliders, and ScoreExplanation wiring
    - Derive scored rows and best-offer highlight solely from `scoreOffers(offers, weights)`; ScoreExplanation shows `scoreExplanation(weights)` text; sliders constrained 0–100 inclusive; weight change recomputes and updates highlight within 500ms of settling
    - Empty state when no offers; add-offer control opens the OfferFormDrawer
    - If scoring is unavailable/errors, suppress scores/highlight/explanation, show a scoring-unavailable error, and retain offer + weights inputs
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 14.2 Write property test for scoring fidelity
    - **Property 4: Scoring fidelity**
    - For any offer set and weights, the highlighted best offer equals `argmax(scoreOffers(offers, weights).score)` and the UI performs no independent scoring math
    - **Validates: Requirements 10.2, 10.3**

  - [x] 14.3 Gate Offers export behind Plan_Gate
    - For Free_User gate the export action; a Free_User activating export is blocked and shown the Plan_Gate upgrade prompt
    - _Requirements: 10.9, 10.10_

  - [x] 14.4 Write unit tests for Offers states and export gating
    - Test empty state, scoring-error suppression with input retention, slider bounds, and free-user export gating
    - _Requirements: 10.4, 10.7, 10.8, 10.10_

- [x] 15. Implement Notes page
  - [x] 15.1 Build NotesToolbar, NoteGrid, and NoteEditorDrawer
    - Toolbar with search input and round filter chips; grid rendering `useNotes` notes; editor drawer with labeled title (required), linked job (optional), round (optional), content (required)
    - Empty save of title/content blocks save with inline validation and does not call create/update; client-side search (case-insensitive substring over title/content within 300ms of pause) and round-chip filter; show all when search empty and no chip selected; empty-state when nothing matches
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 15.2 Wire Notes mutation toasts and value retention
    - Success toast (3–5s) on create/update/delete success; failure toast (3–5s) on failure while retaining unsaved field values in the drawer
    - _Requirements: 11.9, 11.10_

  - [x] 15.3 Write unit tests for Notes search/filter and mutation feedback
    - Test substring search, round filtering, no-match empty state, required-field validation, and success/error toast paths with value retention
    - _Requirements: 11.4, 11.5, 11.7, 11.8, 11.9, 11.10_

- [x] 16. Implement Pricing/Billing page (MarketingShell)
  - [x] 16.1 Build PricingTable and Stripe CTA wiring
    - Pricing table with one column per plan (Free/Pro), one row per feature, persistent recommended highlight on Pro; indicate current plan from `useUserPlan`
    - Free_User upgrade CTA starts existing Stripe checkout within 3s; Pro_User manage-billing CTA starts existing billing portal within 3s; disable initiating CTA and show a loading indicator while in progress
    - On failure or no completion within 30s show an error toast, retain the user with no plan change, and present a retry CTA; if plan data unavailable, show the table without current-plan indicator and present both CTAs
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 16.2 Write unit tests for Pricing states and CTA flows
    - Test recommended highlight, current-plan indication, loading/disabled state, failure/timeout error + retry, and plan-data-unavailable fallback
    - _Requirements: 12.1, 12.4, 12.5, 12.6, 12.7_

- [x] 17. Implement Settings page
  - [x] 17.1 Build sectioned Settings layout with appearance and billing controls
    - Six sections in order: profile, appearance, billing, data, privacy, danger zone
    - Appearance theme toggle (light/dark, exactly one selected) applies and persists selection across sessions; billing section shows plan status (Free/Pro) and a manage-billing control; if billing portal does not open within 5s show an error and keep the user on settings with no plan change
    - Data section gates export behind Plan_Gate for Free_User (prevents export, shows Pro upgrade prompt)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 17.2 Write unit tests for Settings sections and gating
    - Test section order, theme persistence, billing-portal timeout error, and data-export gating for free users
    - _Requirements: 13.1, 13.3, 13.6, 13.7_

- [x] 18. Apply cross-cutting accessibility, responsive, and motion behavior
  - [x] 18.1 Enforce focus, labels, color-independence, and touch targets across surfaces
    - Visible indigo focus ring (>=2px, unclipped, within viewport); every form input has a persistent associated label with hints via `aria-describedby`; status conveyed via text + tone; interactive controls >=44x44px
    - No horizontal scroll at 375/768/1024/1440px; below 768px collapse tables to one-record cards and reflow multi-column grids to single column
    - _Requirements: 15.1, 15.2, 15.5, 15.6, 15.7, 15.9_

  - [x] 18.2 Implement motion and reduced-motion handling app-wide
    - Page/section reveals 0.18–0.5s; list stagger per-item 0.18–0.5s; hover feedback via color/opacity only (0.15–0.3s) with no layout-shifting scale transforms
    - Global `prefers-reduced-motion: reduce` guard disables reveals, stagger, hover transitions, and chart animation, rendering final state within 0.01s
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 18.3 Write property test for theme parity
    - **Property 1: Theme parity**
    - For any in-scope surface rendered in light and dark, primary and muted text resolve to tokens meeting AA contrast (4.5:1) and no element depends on a single theme's contrast
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [x] 18.4 Write property test for data isolation
    - **Property 5: Data isolation**
    - For any rendered Data_View, only authenticated-hook data is displayed and no client-side user-identifying value (id, email, username, token, cookie, URL param) is read to scope queries
    - **Validates: Requirements 17.1, 17.2**

  - [x] 18.5 Write accessibility/responsive unit tests
    - Automated axe checks per page; test focus ring visibility, label associations, color-independent status, no horizontal scroll and table→card collapse at the four breakpoints
    - _Requirements: 15.2, 15.5, 15.6, 15.7, 15.9_

- [x] 19. Final integration and wiring
  - [x] 19.1 Wire all pages into the App Router with the correct shells
    - Mount public routes under MarketingShell and protected routes under DashboardShell; confirm no orphaned components and every page consumes only existing hooks/`lib` outputs without altering API/model/scoring/insights/auth/Stripe contracts
    - _Requirements: 1.1, 1.2, 17.3_

  - [x] 19.2 Write integration tests for end-to-end UI flows
    - Test shell-by-route selection, navigation across surfaces, and a representative gated-action → pricing flow using mocked hooks
    - _Requirements: 1.1, 1.2, 4.7, 17.3_

- [x] 20. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit, property, integration tests) and can be skipped for a faster MVP, though they validate the design's correctness properties.
- Each task references specific granular requirements for traceability.
- The seven design correctness properties map to property tests: Property 1 (18.3), Property 2 (3.2), Property 3 (3.4), Property 4 (14.2), Property 5 (18.4), Property 6 (2.3), Property 7 (5.3). A companion filter/sort stability property is at 10.2.
- Property-based tests use fast-check (TypeScript); unit tests cover examples and edge cases.
- All work is presentation-layer only: the REST API, Mongoose models, scoring/insights engines, auth/middleware, Stripe billing, and theming engine are consumed unchanged.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.5", "6.1"] },
    { "id": 1, "tasks": ["1.3", "3.1", "5.1", "6.2"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.2", "3.3", "5.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.2", "3.4", "5.3", "5.4", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1", "10.1", "14.1", "15.1", "16.1", "17.1"] },
    { "id": 5, "tasks": ["8.2", "10.3", "11.1", "12.1", "14.3", "15.2"] },
    { "id": 6, "tasks": ["8.3", "10.2", "10.4", "11.2", "12.2", "14.2", "14.4", "15.3", "16.2", "17.2"] },
    { "id": 7, "tasks": ["12.3", "18.1", "18.2"] },
    { "id": 8, "tasks": ["18.3", "18.4", "18.5", "19.1"] },
    { "id": 9, "tasks": ["19.2"] }
  ]
}
```
