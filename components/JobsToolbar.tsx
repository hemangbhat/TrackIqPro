"use client";
import React from "react";
import { Input, Select } from "./ui/primitives";
import { SearchIcon, SortIcon } from "./ui/icons";
import {
    JobSort,
    StageFilter,
    STAGE_FILTERS,
} from "../lib/job-filter";

export interface JobsToolbarProps {
    /** Current (committed) search query. */
    query: string;
    /** Called with the debounced search query as the user types. */
    onQueryChange: (q: string) => void;
    /** Currently selected stage filter. */
    stage: StageFilter;
    onStageChange: (s: StageFilter) => void;
    /** Currently selected sort criterion. */
    sort: JobSort;
    onSortChange: (s: JobSort) => void;
    /** Number of jobs currently visible after filter/sort. */
    resultCount: number;
}

const SORT_LABELS: Record<JobSort, string> = {
    recent: "Most recent",
    company: "Company (A–Z)",
    salary: "Salary (high–low)",
};

const STAGE_LABELS: Record<StageFilter, string> = {
    all: "All",
    applied: "Applied",
    screening: "Screening",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
    accepted: "Accepted",
    withdrawn: "Withdrawn",
};

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Jobs page toolbar: debounced search input, stage filter chips, sort control,
 * and the current result count. Purely presentational — all filtering/sorting
 * is computed client-side by the parent via `filterAndSortJobs` (lib/job-filter).
 *
 * Implements Requirement 7.1 (toolbar with search, stage chips, sort, count).
 */
export default function JobsToolbar({
    query,
    onQueryChange,
    stage,
    onStageChange,
    sort,
    onSortChange,
    resultCount,
}: JobsToolbarProps) {
    // Local input value so typing is responsive; debounce notifying the parent.
    const [value, setValue] = React.useState(query);
    const searchId = React.useId();
    const sortId = React.useId();

    // Keep local input in sync if the query is reset/changed externally.
    React.useEffect(() => {
        setValue(query);
    }, [query]);

    React.useEffect(() => {
        if (value === query) return;
        const handle = setTimeout(() => onQueryChange(value), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [value, query, onQueryChange]);

    return (
        <div className="glass-panel gradient-border rounded-2xl p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Search */}
                <div className="relative w-full lg:max-w-sm">
                    <label htmlFor={searchId} className="sr-only">
                        Search jobs
                    </label>
                    <span
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        aria-hidden="true"
                    >
                        <SearchIcon size={18} />
                    </span>
                    <Input
                        id={searchId}
                        type="search"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Search title, company, or location"
                        className="rounded-full pl-11"
                    />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <label
                        htmlFor={sortId}
                        className="flex items-center gap-1.5 font-mono-label text-[11px] uppercase text-[var(--text-muted)]"
                    >
                        <SortIcon size={16} aria-hidden="true" />
                        Sort
                    </label>
                    <Select
                        id={sortId}
                        value={sort}
                        onChange={(e) => onSortChange(e.target.value as JobSort)}
                        className="w-auto rounded-full"
                    >
                        {(Object.keys(SORT_LABELS) as JobSort[]).map((key) => (
                            <option key={key} value={key}>
                                {SORT_LABELS[key]}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            {/* Stage filter chips + result count */}
            <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border)]/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                    className="flex flex-wrap items-center gap-2"
                    role="group"
                    aria-label="Filter by stage"
                >
                    {STAGE_FILTERS.map((s) => {
                        const active = s === stage;
                        return (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onStageChange(s)}
                                className={[
                                    "inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors duration-200",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
                                    active
                                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                                        : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
                                ].join(" ")}
                            >
                                {STAGE_LABELS[s]}
                            </button>
                        );
                    })}
                </div>

                <p
                    className="shrink-0 font-mono-label text-[11px] uppercase text-[var(--text-muted)]"
                    aria-live="polite"
                >
                    {resultCount} {resultCount === 1 ? "result" : "results"}
                </p>
            </div>
        </div>
    );
}
