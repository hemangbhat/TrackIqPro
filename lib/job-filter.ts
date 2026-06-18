// lib/job-filter.ts
// Pure, client-side filtering and sorting for the Jobs list.
// Operates over the array returned by useJobs(); performs NO data fetching and
// changes no API/model contract. Consumed by JobsToolbar / JobsPage (task 10.1)
// and validated by the filter/sort-integrity property test (task 10.2).
import { Job } from "../types";

/** Sort criteria exposed by the jobs toolbar. */
export type JobSort = "recent" | "company" | "salary";

/** Stage filter value: a concrete job stage, or "all" for no stage constraint. */
export type StageFilter = Job["stage"] | "all";

/**
 * The canonical stage set, in display order, used to render the filter chips.
 * Mirrors the `stage` union in `types/index.ts` (Requirement 7.4).
 */
export const JOB_STAGES: readonly Job["stage"][] = [
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "accepted",
    "withdrawn",
] as const;

/** All stage-filter chip values, including the leading "all" option. */
export const STAGE_FILTERS: readonly StageFilter[] = ["all", ...JOB_STAGES] as const;

/** Combined filter + sort inputs computed client-side over the jobs array. */
export interface JobFilterOptions {
    /** Free-text search query (case-insensitive substring). */
    query: string;
    /** Stage filter; "all" applies no stage constraint. */
    stage: StageFilter;
    /** Sort criterion applied to the filtered set. */
    sort: JobSort;
}

/**
 * Filter jobs by a case-insensitive substring search across title/company/location
 * and by stage. An empty/whitespace-only query matches every job; a stage of
 * "all" applies no stage constraint.
 *
 * Implements Requirements 7.2, 7.3, 7.4. Returns a new array; never mutates input.
 */
export function filterJobs(
    jobs: Job[],
    query: string,
    stage: StageFilter
): Job[] {
    const needle = query.trim().toLowerCase();

    return jobs.filter((job) => {
        if (stage !== "all" && job.stage !== stage) return false;
        if (needle === "") return true;

        const haystack = [job.title, job.company, job.location]
            .filter((v): v is string => typeof v === "string")
            .join(" ")
            .toLowerCase();

        return haystack.includes(needle);
    });
}

/** Timestamp used for the "recent" sort: dateApplied, falling back to createdAt. */
function appliedTime(job: Job): number {
    const raw = job.dateApplied ?? job.createdAt;
    const t = raw ? new Date(raw).getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
}

/**
 * Sort jobs by the selected criterion. The result is a stable permutation of the
 * input: it contains exactly the same items, and ties preserve the input order
 * (decorated with the original index as a deterministic tiebreaker).
 *
 * - "recent":  most recently applied first (dateApplied desc, then createdAt).
 * - "company": company name ascending, case-insensitive.
 * - "salary":  highest salary first; jobs without a salary sort last.
 *
 * Implements Requirement 7.5. Returns a new array; never mutates input.
 */
export function sortJobs(jobs: Job[], sort: JobSort): Job[] {
    const decorated = jobs.map((job, index) => ({ job, index }));

    const compare: Record<JobSort, (a: typeof decorated[number], b: typeof decorated[number]) => number> = {
        recent: (a, b) => appliedTime(b.job) - appliedTime(a.job),
        company: (a, b) =>
            a.job.company.localeCompare(b.job.company, undefined, {
                sensitivity: "base",
            }),
        salary: (a, b) => {
            const sa = typeof a.job.salary === "number" ? a.job.salary : -Infinity;
            const sb = typeof b.job.salary === "number" ? b.job.salary : -Infinity;
            return sb - sa;
        },
    };

    const cmp = compare[sort];

    decorated.sort((a, b) => {
        const primary = cmp(a, b);
        // Stable tiebreaker: preserve original input order for equal keys.
        return primary !== 0 ? primary : a.index - b.index;
    });

    return decorated.map((d) => d.job);
}

/**
 * Apply the toolbar's filter then sort to the jobs array. The visible set is the
 * filtered matches, reordered by the selected criterion while preserving exactly
 * that set of items (Requirements 7.2–7.5).
 */
export function filterAndSortJobs(
    jobs: Job[],
    { query, stage, sort }: JobFilterOptions
): Job[] {
    return sortJobs(filterJobs(jobs, query, stage), sort);
}
