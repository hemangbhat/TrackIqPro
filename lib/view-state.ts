// lib/view-state.ts
//
// Reusable, presentation-layer view-state resolver for Data_Views.
//
// A Data_View consumes a Data_Hook (useJobs / useOffers / useNotes / ...) that
// exposes `{ loading, error, data }` and derives EXACTLY ONE mutually-exclusive
// View_State from it: "loading" | "empty" | "error" | "ready".
//
// This module is pure (no React, no side effects) so it can be unit/property
// tested in isolation and reused by the <DataView /> component and any page.
//
// Requirements: 3.1, 3.2, 3.3, 3.5, 3.6

/** The mutually-exclusive presentation state of a Data_View. */
export type ViewState = "loading" | "empty" | "error" | "ready";

/** The minimal slice of a Data_Hook the resolver needs. */
export interface ViewStateInput<T> {
    /** True while the hook's fetch is in flight. */
    loading: boolean;
    /** Non-empty/non-null when the most recent fetch failed. */
    error?: string | null;
    /** The items returned by the hook (may be null/undefined before first load). */
    data?: T[] | null;
}

/**
 * Derive exactly one View_State from a Data_Hook's loading/error/data.
 *
 * Precedence (yields exactly one state for any input — Requirement 3.6):
 *   1. loading  — a fetch (including a retry) is in flight (Req 3.1, 3.4).
 *   2. error    — the most recent fetch failed (Req 3.3). Note: prior data is
 *                 preserved by the hook and is NOT cleared here; the resolver
 *                 only decides which single state to present.
 *   3. empty    — resolved with zero items (Req 3.2).
 *   4. ready    — resolved with one or more items (Req 3.5).
 *
 * `loading` intentionally takes precedence over `error` so that activating a
 * retry (which sets loading=true) transitions the view to the loading state
 * even if a stale error value lingers (Requirement 3.4).
 */
export function resolveViewState<T>(input: ViewStateInput<T>): ViewState {
    const { loading, error } = input;

    if (loading) return "loading";
    if (error != null && error !== "") return "error";

    const items = Array.isArray(input.data) ? input.data : [];
    if (items.length === 0) return "empty";

    return "ready";
}

/** Type guard helpers for ergonomic branching in components. */
export const isLoading = (s: ViewState): s is "loading" => s === "loading";
export const isEmpty = (s: ViewState): s is "empty" => s === "empty";
export const isError = (s: ViewState): s is "error" => s === "error";
export const isReady = (s: ViewState): s is "ready" => s === "ready";
