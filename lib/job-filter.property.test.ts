// lib/job-filter.property.test.ts
// Property-based tests for the client-side jobs filter/sort pipeline (task 10.2).
// Companion to the example-based suite in job-filter.test.ts; these assert the
// universal filter+sort-integrity invariants over arbitrary Job arrays.
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Job } from "../types";
import {
    filterJobs,
    sortJobs,
    filterAndSortJobs,
    JOB_STAGES,
    STAGE_FILTERS,
    JobSort,
    StageFilter,
} from "./job-filter";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const STAGES = JOB_STAGES as readonly Job["stage"][];
const SORTS: readonly JobSort[] = ["recent", "company", "salary"] as const;

// A small text pool so the search query has a realistic chance of matching
// (and overlapping) the title/company/location fields.
const wordArb = fc.constantFrom(
    "engineer",
    "designer",
    "acme",
    "globex",
    "remote",
    "berlin",
    "senior",
    "data",
    "",
    "xyz"
);

const phraseArb = fc
    .array(wordArb, { minLength: 0, maxLength: 3 })
    .map((words) => words.join(" ").trim());

const dateArb = fc.oneof(
    fc
        .integer({ min: 0, max: 4102444800000 }) // up to year ~2100
        .map((ms) => new Date(ms).toISOString()),
    fc.constantFrom("2024-01-01", "2024-03-15", "not-a-date")
);

function jobArb(): fc.Arbitrary<Job> {
    return fc.record({
        _id: fc.uuid(),
        userId: fc.constant("u1"),
        title: phraseArb,
        company: phraseArb,
        location: fc.option(phraseArb, { nil: undefined }),
        stage: fc.constantFrom(...STAGES),
        status: fc.constantFrom("active", "closed") as fc.Arbitrary<Job["status"]>,
        salary: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: undefined }),
        dateApplied: dateArb,
        createdAt: dateArb,
        updatedAt: dateArb,
    }) as fc.Arbitrary<Job>;
}

// Ensure unique _id values so we can reason about items via identity/sets.
function jobsArb(): fc.Arbitrary<Job[]> {
    return fc
        .array(jobArb(), { minLength: 0, maxLength: 25 })
        .map((jobs) => jobs.map((j, i) => ({ ...j, _id: `${i}-${j._id}` })));
}

const queryArb = fc.oneof(
    phraseArb,
    fc.constant(""),
    fc.constant("   "),
    fc.string({ maxLength: 8 })
);

const stageArb = fc.constantFrom(...STAGE_FILTERS) as fc.Arbitrary<StageFilter>;
const sortArb = fc.constantFrom(...SORTS);

// ---------------------------------------------------------------------------
// Predicate mirror used to independently verify "every output matches filter".
// ---------------------------------------------------------------------------

function matchesFilter(job: Job, query: string, stage: StageFilter): boolean {
    if (stage !== "all" && job.stage !== stage) return false;
    const needle = query.trim().toLowerCase();
    if (needle === "") return true;
    const haystack = [job.title, job.company, job.location]
        .filter((v): v is string => typeof v === "string")
        .join(" ")
        .toLowerCase();
    return haystack.includes(needle);
}

function multiset(ids: string[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("job-filter property tests (filter/sort integrity)", () => {
    // Property 1: filterAndSortJobs output is a subset of input (no items added),
    // and every output item satisfies the filter predicate.
    // **Validates: Requirements 7.2**
    it("output is a subset of input and every item matches the predicate", () => {
        fc.assert(
            fc.property(jobsArb(), queryArb, stageArb, sortArb, (jobs, query, stage, sort) => {
                const inputIds = new Set(jobs.map((j) => j._id));
                const out = filterAndSortJobs(jobs, { query, stage, sort });

                for (const job of out) {
                    // No item added beyond the input.
                    expect(inputIds.has(job._id)).toBe(true);
                    // Every output item satisfies the filter predicate.
                    expect(matchesFilter(job, query, stage)).toBe(true);
                }
            })
        );
    });

    // Property 2: no matching item is dropped — the filterAndSort set equals the
    // filterJobs set (sorting reorders but never removes/adds matches).
    // **Validates: Requirements 7.2**
    it("preserves exactly the matching set (no matches dropped)", () => {
        fc.assert(
            fc.property(jobsArb(), queryArb, stageArb, sortArb, (jobs, query, stage, sort) => {
                const filtered = filterJobs(jobs, query, stage);
                const out = filterAndSortJobs(jobs, { query, stage, sort });

                // Same multiset of items (ids unique, so equivalent to set + length).
                expect(out).toHaveLength(filtered.length);
                expect(new Set(out.map((j) => j._id))).toEqual(
                    new Set(filtered.map((j) => j._id))
                );
            })
        );
    });

    // Property 3a: sortJobs is a permutation of its input (same multiset of items).
    // **Validates: Requirements 7.5**
    it("sortJobs is a permutation of its input", () => {
        fc.assert(
            fc.property(jobsArb(), sortArb, (jobs, sort) => {
                const sorted = sortJobs(jobs, sort);
                expect(sorted).toHaveLength(jobs.length);
                expect(multiset(sorted.map((j) => j._id))).toEqual(
                    multiset(jobs.map((j) => j._id))
                );
            })
        );
    });

    // Property 3b: sortJobs is stable — for equal sort keys, input order is preserved.
    // **Validates: Requirements 7.5**
    it("sortJobs is stable for equal sort keys (ties preserve input order)", () => {
        // Key extractors that mirror the comparator's notion of equality.
        const keyOf: Record<JobSort, (j: Job) => string> = {
            recent: (j) => {
                const raw = j.dateApplied ?? j.createdAt;
                const t = raw ? new Date(raw).getTime() : NaN;
                return String(Number.isNaN(t) ? 0 : t);
            },
            company: (j) => j.company.toLowerCase(),
            salary: (j) => String(typeof j.salary === "number" ? j.salary : -Infinity),
        };

        fc.assert(
            fc.property(jobsArb(), sortArb, (jobs, sort) => {
                const indexOf = new Map(jobs.map((j, i) => [j._id, i]));
                const sorted = sortJobs(jobs, sort);
                const key = keyOf[sort];

                for (let i = 1; i < sorted.length; i++) {
                    const prev = sorted[i - 1];
                    const cur = sorted[i];
                    if (key(prev) === key(cur)) {
                        // Equal keys must retain original relative ordering.
                        expect(indexOf.get(prev._id)!).toBeLessThan(indexOf.get(cur._id)!);
                    }
                }
            })
        );
    });

    // Property 4: an empty (or whitespace-only) query returns all jobs, subject
    // only to the stage constraint.
    // **Validates: Requirements 7.2, 7.5**
    it("empty query returns all jobs subject to the stage filter", () => {
        const emptyQueryArb = fc.constantFrom("", "   ", "\t");
        fc.assert(
            fc.property(jobsArb(), emptyQueryArb, stageArb, (jobs, query, stage) => {
                const out = filterJobs(jobs, query, stage);
                const expected =
                    stage === "all" ? jobs : jobs.filter((j) => j.stage === stage);
                expect(out).toHaveLength(expected.length);
                expect(new Set(out.map((j) => j._id))).toEqual(
                    new Set(expected.map((j) => j._id))
                );
            })
        );
    });
});
