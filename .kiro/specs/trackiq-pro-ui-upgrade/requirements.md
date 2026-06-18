# Requirements Document

## Introduction

This feature is a UI/UX upgrade for TrackIQ Pro, an existing Next.js + TypeScript + Tailwind SaaS application for tracking job/internship applications, keeping private interview notes, comparing offers with a weighted scoring engine, exporting data, and managing premium billing (Stripe + Clerk). The upgrade lifts eight surfaces (Landing, Dashboard, Jobs, Job Details, Offers, Notes, Pricing/Billing, Settings) to a production-grade premium SaaS experience.

The work is confined to the presentation layer. The existing data layer, REST API contracts, Mongoose models, scoring/insights engines, authentication/middleware, Stripe billing logic, and theming engine are preserved unchanged. Requirements below describe the behavior the upgraded UI must exhibit while consuming the existing `pages/api/*` endpoints and the `useJobs` / `useOffers` / `useUserPlan` hooks (plus a new `useNotes` hook that mirrors the existing data-access pattern without changing any API contract).

These requirements are derived from the approved design document (`design.md`) and document the intent, scope, and acceptance criteria of the UI upgrade.

## Glossary

- **TrackIQ_UI**: The upgraded presentation layer of the TrackIQ Pro application, comprising App Router pages, feature components, and the shared UI kit.
- **Marketing_Shell**: The public-route chrome (sticky topbar + footer, no sidebar) used for the Landing and Pricing pages.
- **Dashboard_Shell**: The protected-route chrome providing a fixed sidebar, sticky topbar, mobile drawer, plan badge, and quick-add affordance.
- **Theme_System**: The existing `ThemeProvider` (next-themes, class-based) plus the CSS-variable design tokens that drive light/dark appearance.
- **Plan_Gate**: The advisory client-side mechanism that restricts Pro-only actions for free-plan users, mirroring authoritative server enforcement.
- **Data_Hook**: A client data-access hook (`useJobs`, `useOffers`, `useNotes`, `useUserPlan`) that fetches from the existing REST API and exposes loading/error/data state.
- **Scoring_Engine**: The existing pure functions in `lib/scoring` (`scoreOffers`, `scoreExplanation`, `weightLabels`).
- **Insights_Engine**: The existing pure functions in `lib/insights` that derive KPIs, charts, and follow-up suggestions from jobs.
- **Data_View**: Any UI surface that renders data fetched from a Data_Hook (Jobs list, Notes grid, Offers matrix, Dashboard panels, etc.).
- **View_State**: The mutually exclusive presentation state of a Data_View: loading, empty, error, or ready.
- **FREE_JOB_LIMIT**: The server-enforced maximum number of jobs a free-plan user may create, exposed to the UI via `lib/plans`.
- **Pro_User**: A user whose plan is Pro per `useUserPlan` / `lib/plans.isPro`.
- **Free_User**: A user whose plan is Free per `useUserPlan` / `lib/plans.isPro`.
- **Weights**: The offer-comparison weighting object `{ salary, equity, growth, brand }` consumed by the Scoring_Engine.
- **Reduced_Motion**: The user/system preference expressed by the CSS media query `prefers-reduced-motion: reduce`.

## Requirements

### Requirement 1: Application Shells and Navigation Chrome

**User Story:** As a user, I want consistent navigation chrome that matches whether I am on a public or protected page, so that I always know where I am and how to move through the app.

#### Acceptance Criteria

1. WHERE the current route is in the public group, THE TrackIQ_UI SHALL render the Marketing_Shell containing a sticky topbar, a theme toggle control, a sign-in call to action, a "Get started" call to action, and a footer.
2. WHERE the current route is in the protected group, THE TrackIQ_UI SHALL render the Dashboard_Shell containing a fixed sidebar, a sticky topbar, a plan badge, a quick-add affordance, a theme toggle control, and the Clerk user button.
3. THE TrackIQ_UI SHALL render the sticky topbar fixed to the top of the viewport so that it remains visible in place while the main content scrolls beneath it.
4. WHILE the viewport width is at least 1024 pixels, THE Dashboard_Shell SHALL display the fixed sidebar and offset the main content by a left offset equal to the sidebar width so that the sidebar and main content do not overlap.
5. WHILE the viewport width is below 1024 pixels, THE Dashboard_Shell SHALL hide the fixed sidebar and present a drawer-trigger control in the topbar that is operable by pointer interaction and by keyboard.
6. WHEN the drawer-trigger control is activated, THE Dashboard_Shell SHALL open the slide-in drawer.
7. WHILE the slide-in drawer is open, THE Dashboard_Shell SHALL confine keyboard focus to elements within the drawer, lock body scroll, and keep the drawer open until a close action is invoked.
8. WHEN the Escape key is pressed while the slide-in drawer is open, THE Dashboard_Shell SHALL close the drawer and return keyboard focus to the drawer-trigger control.
9. THE Dashboard_Shell SHALL render exactly one navigation item as active, that being the navigation item whose target matches the current route, using the indigo-filled active treatment.

### Requirement 2: Theme Parity and Design Tokens

**User Story:** As a user, I want every screen to look correct and readable in both light and dark mode, so that I can use the app comfortably in any environment.

#### Acceptance Criteria

1. THE TrackIQ_UI SHALL apply the defined CSS-variable design tokens (background, surface, primary text, muted text, border, indigo accent) to every rendered page in both light and dark themes.
2. WHEN the Theme_System changes the active theme between light and dark, THE TrackIQ_UI SHALL update all surfaces, text, borders, and chart colors to the corresponding theme tokens within 300 milliseconds.
3. THE TrackIQ_UI SHALL render primary text against its background at a contrast ratio of at least 4.5:1 in both light and dark themes.
4. THE TrackIQ_UI SHALL render muted text against its background at a contrast ratio of at least 4.5:1 in both light and dark themes.
5. THE TrackIQ_UI SHALL use the indigo accent for primary buttons, active navigation items, focus rings, and primary chart series.
6. THE TrackIQ_UI SHALL render focus rings and component borders against their adjacent colors at a contrast ratio of at least 3:1 in both light and dark themes.
7. WHEN a page is first rendered, THE TrackIQ_UI SHALL apply the active theme reported by the Theme_System before content is displayed, defaulting to the light theme when no theme preference is available.
8. IF a design token value is missing or fails to resolve for the active theme, THEN THE TrackIQ_UI SHALL apply the corresponding light-theme token value as a fallback and render the affected element with no blank or unreadable area.

### Requirement 3: Data View States

**User Story:** As a user, I want clear feedback while data loads, is empty, fails, or is ready, so that I always understand the state of my information.

#### Acceptance Criteria

1. WHILE a Data_Hook reports loading, THE Data_View SHALL display a skeleton placeholder whose number of placeholder regions and their arrangement match the ready state layout structure.
2. WHEN a Data_Hook resolves with zero items, THE Data_View SHALL display an empty state containing exactly one icon, one block of explanatory text, and exactly one primary call-to-action control.
3. IF a Data_Hook reports an error, THEN THE Data_View SHALL display an error state containing a message indicating that the data could not be loaded and exactly one retry control bound to the Data_Hook's fetch function, while preserving any previously loaded data without modification.
4. WHEN the retry control is activated, THE Data_View SHALL transition to the loading View_State and re-invoke the Data_Hook's fetch function.
5. WHEN a Data_Hook resolves with one or more items, THE Data_View SHALL display the ready state rendering all returned items.
6. THE Data_View SHALL present exactly one View_State (loading, empty, error, or ready) at any given time.

### Requirement 4: Plan Gating Consistency

**User Story:** As a free-plan user, I want Pro-only actions to be clearly gated, so that I understand which features require an upgrade without hitting confusing errors.

#### Acceptance Criteria

1. WHERE the current user is a Free_User, THE Plan_Gate SHALL render the export action in a disabled state, display an upgrade prompt that identifies export as a Pro_User feature, and SHALL NOT initiate the export.
2. WHILE a Free_User has a job count equal to or greater than FREE_JOB_LIMIT, THE Plan_Gate SHALL render an inline upgrade prompt within the job creation drawer and SHALL render the submit control in a disabled state that does not initiate submission.
3. WHERE the current user is a Pro_User, THE Plan_Gate SHALL enable the export action.
4. WHERE the current user is a Pro_User, THE Plan_Gate SHALL enable job creation without applying the FREE_JOB_LIMIT.
5. THE Plan_Gate SHALL treat the server response as the authoritative determination of whether a gated action is permitted.
6. IF the server rejects a gated action, THEN THE TrackIQ_UI SHALL display the upgrade prompt corresponding to that action within 1 second of receiving the response and SHALL retain any user-entered data without resubmitting it.
7. WHEN a Free_User selects an upgrade prompt, THE TrackIQ_UI SHALL navigate the user to the pricing page within 1 second.

### Requirement 5: Landing Page

**User Story:** As a prospective user, I want a clear marketing landing page, so that I can understand the product and decide to sign up.

#### Acceptance Criteria

1. WHEN a visitor opens the landing route, THE Marketing_Shell SHALL display a hero section containing a headline, subcopy, a primary "Get started" call to action, and a secondary "See pricing" call to action.
2. WHEN a visitor opens the landing route, THE Marketing_Shell SHALL display, in top-to-bottom order, a feature grid containing at least 3 features, a how-it-works section, a pricing preview, a social proof section containing at least 1 testimonial, a closing call-to-action section, and a footer.
3. WHEN a visitor selects the pricing preview or the "See pricing" call to action, THE TrackIQ_UI SHALL navigate the visitor to the pricing page.
4. THE Marketing_Shell SHALL render every icon on the landing page as an SVG icon.
5. THE Marketing_Shell SHALL NOT render any emoji as an icon on the landing page.
6. WHEN a visitor selects the "Get started" call to action, THE TrackIQ_UI SHALL navigate the visitor to the sign-up page.
7. IF navigation to the pricing page or sign-up page fails, THEN THE TrackIQ_UI SHALL retain the visitor on the landing route and display an error message indicating the navigation could not be completed.

### Requirement 6: Dashboard

**User Story:** As a user, I want a dashboard overview of my application activity, so that I can quickly assess my progress and next steps.

#### Acceptance Criteria

1. WHEN the dashboard loads job data successfully, THE TrackIQ_UI SHALL display a key-performance-indicator row containing exactly four stat cards showing total applications as a non-negative integer count, interview rate as a percentage between 0% and 100%, offers as a non-negative integer count, and active applications as a non-negative integer count.
2. WHEN the dashboard loads job data successfully, THE TrackIQ_UI SHALL render a status-breakdown chart and an applications-over-time chart using values derived from the Insights_Engine.
3. WHEN the dashboard loads job data successfully, THE TrackIQ_UI SHALL display a recent-activity list and a follow-up list containing at most five items derived from the Insights_Engine, with the most urgent item ordered first.
4. IF the user has no job data when the dashboard loads, THEN THE TrackIQ_UI SHALL display each stat card with a value of zero and SHALL display an empty-state message in place of the charts, recent-activity list, and follow-up list.
5. IF loading job data fails, THEN THE TrackIQ_UI SHALL display an error indication signaling the load failure and SHALL retain the dashboard layout without rendering stale or partial values.
6. WHERE the current user is a Free_User, THE TrackIQ_UI SHALL display an upsell card.
7. WHEN the dashboard loads, THE TrackIQ_UI SHALL display a plan badge reflecting the user's current plan as either Free or Pro.

### Requirement 7: Jobs List, Filtering, and Sorting

**User Story:** As a user, I want to search, filter, and sort my job applications, so that I can find and manage them efficiently.

#### Acceptance Criteria

1. THE jobs page SHALL display a toolbar with a search input, stage filter chips, and a sort control, and SHALL show the current result count.
2. WHEN the user enters a search query, THE TrackIQ_UI SHALL display only the jobs whose title, company, or location fields contain the query as a case-insensitive substring, computed client-side over the array returned by the jobs Data_Hook.
3. WHILE the search input is empty, THE TrackIQ_UI SHALL display all jobs returned by the jobs Data_Hook.
4. WHEN the user selects a stage filter, THE TrackIQ_UI SHALL display only the jobs whose stage matches the selected value from the set {applied, screening, interview, offer, rejected, accepted, withdrawn}, and SHALL display all jobs when the filter is "all".
5. WHEN the user selects a sort option, THE TrackIQ_UI SHALL display the currently visible set of jobs reordered by the selected criterion while preserving the same set of items.
6. IF the search query and stage filter together match no jobs, THEN THE TrackIQ_UI SHALL display a no-results empty state and SHALL show a result count of 0.
7. WHILE the viewport width is at least 768 pixels, THE jobs page SHALL render a dense table layout.
8. WHILE the viewport width is below 768 pixels, THE jobs page SHALL render a stacked card layout.
9. WHEN the user selects a job row's open action, THE TrackIQ_UI SHALL navigate to that job's details page.
10. WHEN the user invokes an edit or delete action, THE TrackIQ_UI SHALL invoke the corresponding jobs Data_Hook mutation and SHALL display the updated job list reflecting the change.
11. IF a jobs Data_Hook edit or delete mutation fails, THEN THE TrackIQ_UI SHALL display an error indication identifying the failed operation and SHALL preserve the existing job list unchanged.

### Requirement 8: Job Creation and Editing

**User Story:** As a user, I want to add and edit job applications through an accessible form, so that I can keep my tracker accurate.

#### Acceptance Criteria

1. WHEN the user opens the job form drawer, THE TrackIQ_UI SHALL display labeled fields for title, company, location, stage, status, salary, link, description, and notes, where title, company, stage, and status are marked as required and the remaining fields are marked as optional.
2. WHEN the user opens the job form drawer to create a new job, THE TrackIQ_UI SHALL preselect stage as "applied" and status as "active" as default values.
3. WHEN the user submits the job form, THE TrackIQ_UI SHALL accept the submission as valid only if title and company each contain at least 1 non-whitespace character, stage is one of {applied, screening, interview, offer, rejected, accepted, withdrawn}, status is one of {active, closed}, and salary, when provided, is a number greater than or equal to 0.
4. WHEN the user submits a valid job form, THE TrackIQ_UI SHALL invoke the corresponding jobs Data_Hook mutation.
5. WHEN the jobs Data_Hook mutation succeeds, THE TrackIQ_UI SHALL close the drawer and display a success toast that auto-dismisses within 5 seconds.
6. IF the user submits the job form while one or more required fields are empty or any field value fails the validation in criterion 3, THEN THE TrackIQ_UI SHALL block the mutation, keep the drawer open with the entered values retained, and display a validation message identifying each invalid field.
7. IF the jobs Data_Hook mutation fails, THEN THE TrackIQ_UI SHALL keep the drawer open with the entered values retained and display an error toast indicating that the save did not complete.
8. THE job form drawer SHALL associate every input with a visible text label via an explicit programmatic association.

### Requirement 9: Job Details

**User Story:** As a user, I want a detailed view of a single job application, so that I can review and update its full context in one place.

#### Acceptance Criteria

1. WHEN the user opens a job details page for an existing job, THE TrackIQ_UI SHALL display the job header, a stage stepper, a metadata panel, a linked-notes panel, a follow-up panel, and a related-offers panel.
2. WHEN the user changes the stage via the stage stepper, THE TrackIQ_UI SHALL invoke the jobs Data_Hook update for that job with the newly selected stage value.
3. WHEN the linked-notes panel is displayed, THE TrackIQ_UI SHALL display all notes associated with the current job via the existing job-id filter, and SHALL display an empty-state message when no notes are associated with the current job.
4. THE job details page SHALL provide an edit action and a delete action for the current job, and SHALL require explicit user confirmation before performing the delete action.
5. IF the requested job does not exist or cannot be retrieved, THEN THE TrackIQ_UI SHALL display an error message indicating the job could not be loaded and SHALL NOT render the six panels.
6. IF the jobs Data_Hook update fails, THEN THE TrackIQ_UI SHALL retain the previously displayed stage value and display an error message indicating the stage update failed.
7. WHEN the user confirms deletion, THE TrackIQ_UI SHALL invoke the jobs Data_Hook delete for that job and navigate away from the job details page.

### Requirement 10: Offer Comparison and Scoring

**User Story:** As a user, I want to compare offers with adjustable weights, so that I can decide which offer is best for me.

#### Acceptance Criteria

1. THE offers page SHALL display an offer matrix, weight sliders, and a score explanation.
2. THE TrackIQ_UI SHALL derive offer scores and the best-offer highlight solely from the Scoring_Engine output for the current offers and Weights, performing no independent scoring computation.
3. WHEN the user adjusts a weight slider, THE TrackIQ_UI SHALL recompute offer scores from the Scoring_Engine and update the best-offer highlight within 500 milliseconds of the slider value settling.
4. THE TrackIQ_UI SHALL constrain each weight slider to a value between 0 and 100 inclusive.
5. THE score explanation SHALL display the text produced by the Scoring_Engine for the current Weights.
6. WHEN the user activates the add-offer control, THE TrackIQ_UI SHALL open the add-offer drawer.
7. WHILE the current user has no offers, THE offers page SHALL display an empty state in place of the offer matrix and best-offer highlight.
8. IF the Scoring_Engine output is unavailable or returns an error, THEN THE TrackIQ_UI SHALL suppress the offer scores, best-offer highlight, and score explanation, and SHALL display an error indication that scoring is unavailable, retaining the current offer and Weights inputs without modification.
9. WHERE the current user is a Free_User, THE offers page SHALL gate the export action behind the Plan_Gate.
10. IF a Free_User activates the export action, THEN THE offers page SHALL block the export and present the Plan_Gate upgrade prompt.

### Requirement 11: Notes

**User Story:** As a user, I want to create, view, and edit private interview notes linked to jobs, so that I can keep my preparation organized.

#### Acceptance Criteria

1. THE notes page SHALL display a toolbar containing a search input and round filter chips, a note grid showing the notes returned by the notes Data_Hook, and a note editor drawer.
2. THE TrackIQ_UI SHALL retrieve, create, update, and delete notes through the `useNotes` Data_Hook using the existing notes API without changing the API contract.
3. WHEN the user opens the note editor drawer, THE TrackIQ_UI SHALL display labeled fields for title (required), linked job (optional), round (optional), and content (required).
4. IF the user attempts to save a note while the title or content field is empty, THEN THE TrackIQ_UI SHALL block the save, display an inline validation message indicating which required field is missing, and SHALL NOT invoke the create or update operation on the notes Data_Hook.
5. WHEN a non-empty search query is entered, THE TrackIQ_UI SHALL display only the notes whose title or content contains the query as a case-insensitive substring, computed client-side over the array returned by the notes Data_Hook, within 300 milliseconds of the user pausing input.
6. WHILE the search input is empty and no round filter chip is selected, THE TrackIQ_UI SHALL display all notes returned by the notes Data_Hook.
7. WHEN a round filter chip is selected, THE TrackIQ_UI SHALL display only the notes whose round value equals the selected chip's round value, computed client-side over the array returned by the notes Data_Hook.
8. IF the active search query and selected filter chip match zero notes, THEN THE TrackIQ_UI SHALL display an empty-state message indicating that no notes match the current search or filter.
9. WHEN a note create, update, or delete operation succeeds, THE TrackIQ_UI SHALL display a success toast for between 3 and 5 seconds.
10. IF a note create, update, or delete operation fails, THEN THE TrackIQ_UI SHALL display an error toast for between 3 and 5 seconds indicating that the operation failed, and SHALL retain the user's unsaved field values in the editor drawer.

### Requirement 12: Pricing and Billing

**User Story:** As a user, I want a clear pricing and billing page, so that I can upgrade to Pro or manage my existing subscription.

#### Acceptance Criteria

1. WHEN the pricing page loads, THE TrackIQ_UI SHALL display a pricing table with one column per plan (Free and Pro) and one row per compared feature, with the Pro plan column rendered with a persistent highlighted (recommended-plan) indicator.
2. WHEN a Free_User selects the upgrade call to action, THE TrackIQ_UI SHALL initiate the existing Stripe checkout flow within 3 seconds.
3. WHEN a Pro_User selects the manage-billing call to action, THE TrackIQ_UI SHALL initiate the existing Stripe billing-portal flow within 3 seconds.
4. WHEN plan data becomes available from the user-plan Data_Hook, THE TrackIQ_UI SHALL indicate the user's current plan in the pricing table.
5. WHILE a checkout or billing-portal request is in progress, THE TrackIQ_UI SHALL disable the initiating call to action and display a loading indicator.
6. IF a checkout or billing-portal request fails or does not complete within 30 seconds, THEN THE TrackIQ_UI SHALL display an error toast indicating the failure, retain the user on the pricing page with no plan change applied, and present a retry call to action.
7. IF plan data is unavailable from the user-plan Data_Hook, THEN THE TrackIQ_UI SHALL display the pricing table without a current-plan indicator and present both the upgrade and manage-billing call-to-action options.

### Requirement 13: Settings

**User Story:** As a user, I want a settings page organized into sections, so that I can manage my profile, appearance, billing, and data in one place.

#### Acceptance Criteria

1. WHEN a user navigates to the settings page, THE TrackIQ_UI SHALL display the settings page organized into six sections in the following order: profile, appearance, billing, data, privacy, and danger zone.
2. THE TrackIQ_UI appearance section SHALL provide a theme toggle control offering a light theme option and a dark theme option, with exactly one option selected at any time.
3. WHEN a user selects a theme option in the appearance section, THE TrackIQ_UI SHALL apply the selected theme and persist the selection so that it is restored on the next session.
4. THE TrackIQ_UI billing section SHALL display the current plan status as one of: Free or Pro.
5. THE TrackIQ_UI billing section SHALL display a manage-billing control.
6. IF the manage-billing control is activated and the billing portal does not open within 5 seconds, THEN THE TrackIQ_UI SHALL display an error message indicating the billing portal is unavailable and SHALL keep the user on the settings page with no change to plan status.
7. WHERE the current user is a Free_User, THE TrackIQ_UI data section SHALL gate the export action behind the Plan_Gate by preventing the export action from executing and displaying an upgrade prompt indicating that export requires a Pro plan.

### Requirement 14: Charts

**User Story:** As a user, I want charts that are readable and accessible in both themes, so that I can interpret my data regardless of appearance or ability.

#### Acceptance Criteria

1. WHEN the active theme changes, THE TrackIQ_UI SHALL update chart tick, grid, axis, and label colors to the active theme's palette within 500 milliseconds of the theme change.
2. THE TrackIQ_UI SHALL render chart label and tick text at a contrast ratio of at least 4.5:1, and grid and axis lines at a contrast ratio of at least 3:1, measured against the active theme's chart background.
3. THE TrackIQ_UI SHALL pair every chart with a text summary that is programmatically associated with the chart, exposed to assistive technologies, and that states the chart's data values and overall trend.
4. THE TrackIQ_UI SHALL distinguish every chart data series by at least one non-color attribute (direct label, pattern, or shape marker) in addition to color.
5. WHILE Reduced_Motion is set, THE TrackIQ_UI SHALL render charts directly in their final state with animation duration set to zero for both initial render and data updates.

### Requirement 15: Accessibility and Responsive Behavior

**User Story:** As a user relying on keyboard or assistive technology, I want the interface to be accessible and responsive, so that I can use the app on any device and input method.

#### Acceptance Criteria

1. THE TrackIQ_UI SHALL render every form input with a persistently visible text label that is programmatically associated with that input, and SHALL reference any accompanying hint text from the input via `aria-describedby`.
2. WHEN an interactive element receives keyboard focus, THE TrackIQ_UI SHALL display a visible indigo focus ring with a minimum thickness of 2 CSS pixels that remains fully within the viewport and is not clipped by surrounding elements.
3. WHILE a modal or drawer is open, THE TrackIQ_UI SHALL confine keyboard focus to the elements within it so that Tab and Shift+Tab cycle only through those elements.
4. WHEN the user presses the Escape key while a modal or drawer is open, THE TrackIQ_UI SHALL close that modal or drawer and return keyboard focus to the element that triggered it, or to the nearest focusable ancestor if the triggering element is no longer present.
5. THE TrackIQ_UI SHALL convey every status using both visible text and a color tone, such that the status remains distinguishable when color is removed.
6. THE TrackIQ_UI SHALL render all page content without horizontal scrolling at viewport widths of exactly 375, 768, 1024, and 1440 CSS pixels.
7. WHILE the viewport width is below 768 CSS pixels, THE TrackIQ_UI SHALL collapse each data table into stacked cards of one record each and reflow every multi-column grid into a single column.
8. WHEN a form submission fails validation, THE TrackIQ_UI SHALL move keyboard focus to the first invalid input, display a text error message associated with that input via `aria-describedby`, and retain all values the user already entered.
9. THE TrackIQ_UI SHALL render every interactive control with a touch target measuring at least 44 by 44 CSS pixels.

### Requirement 16: Motion and Reduced Motion

**User Story:** As a user sensitive to motion, I want animations to respect my system preference, so that I can use the app without discomfort.

#### Acceptance Criteria

1. WHEN a page or section is revealed, THE TrackIQ_UI SHALL play its reveal animation with a duration between 0.18 and 0.5 seconds.
2. WHEN a list is rendered, THE TrackIQ_UI SHALL apply a staggered entrance animation to its items, with each item's animation duration between 0.18 and 0.5 seconds.
3. WHILE Reduced_Motion is set, THE TrackIQ_UI SHALL disable all motion-based animations (page reveals, section reveals, list staggering, and hover transitions) and SHALL render the corresponding state change to its final visual state within 0.01 seconds.
4. WHEN a user hovers over an interactive element, THE TrackIQ_UI SHALL provide hover feedback using only color and opacity transitions with a transition duration between 0.15 and 0.3 seconds.
5. THE TrackIQ_UI SHALL NOT apply scale transforms that alter an element's layout dimensions or shift surrounding content on hover.

### Requirement 17: Data Isolation and Preservation of Backend Contracts

**User Story:** As a security-conscious user, I want the UI to rely only on authenticated server data, so that my data stays scoped to me and the system remains trustworthy.

#### Acceptance Criteria

1. THE TrackIQ_UI SHALL render only the data returned by the authenticated Data_Hooks and SHALL NOT display any data sourced from client-side storage, hard-coded values, or unauthenticated requests.
2. THE TrackIQ_UI SHALL NOT read any client-side user-identifying value, including user ID, email address, username, session token, authentication cookie, or URL parameter, to scope data queries.
3. THE TrackIQ_UI SHALL consume the existing REST API, Mongoose models, scoring/insights engines, authentication/middleware, and Stripe billing flow without altering their request or response contracts, where contracts comprise endpoint paths, HTTP methods, request parameters, and request/response field names, types, and structures.
4. WHILE a Data_Hook request is in flight, THE TrackIQ_UI SHALL display a loading-state indicator and SHALL NOT render stale or partial result data.
5. WHEN a Data_Hook request completes successfully with zero records, THE TrackIQ_UI SHALL render an empty-state indication that is visually distinct from an error indication.
6. IF a Data_Hook request fails with a non-unauthorized response, THEN THE TrackIQ_UI SHALL display an error indication conveying that data could not be loaded and SHALL preserve the previously rendered application state without modifying it.
7. IF a Data_Hook request returns an unauthorized response, THEN THE TrackIQ_UI SHALL not render the requested data and SHALL allow the existing authentication middleware to redirect the user to sign-in.
