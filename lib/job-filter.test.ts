import { describe, it, expect } from "vitest";
import { Job } from "../types";
import {
    filterJobs,
    sortJobs,
    filterAndSortJobs,
    STAGE_FILTERS,
    JOB_STAGES,
} from "./job-filter";

function job(overrides: Partial<Job> = {}): Job {
    return {
        _id: Math.random().toString(36).slice(2),
        userId: "u1",
        title: "Software Engineer",
        company: "Acme",
        location: "Remote",
        stage: "applied",
        status: "active",
        dateApplied: "2024-01-01",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        ...overrides,
    };
}

describe("filterJobs", () => {
    it("returns all jobs when the query is empty and stage is 'all'", () => {
        const jobs = [job(), job({ title: "PM" })];
        expect(filterJobs(jobs, "", "all")).toHaveLength(2);
        expect(filterJobs(jobs, "   ", "all")).toHaveLength(2);
    });

    it("matches case-insensitive substrings across title, company, and location", () => {
        const jobs = [
            job({ title: "Backend Engineer", company: "Acme" }),
            job({ title: "Designer", company: "Globex", location: "Berlin" }),
            job({ title: "Analyst", company: "Initech", location: "NYC" }),
        ];
        expect(filterJobs(jobs, "engineer", "all")).toHaveLength(1);
        expect(filterJobs(jobs, "GLOBEX", "all")).toHaveLength(1);
        expect(filterJobs(jobs, "berlin", "all")).toHaveLength(1);
        expect(filterJobs(jobs, "zzz", "all")).toHaveLength(0);
    });

    it("filters by stage, and 'all' applies no stage constraint", () => {
        const jobs = [
            job({ stage: "applied" }),
            job({ stage: "interview" }),
            job({ stage: "offer" }),
        ];
        expect(filterJobs(jobs, "", "interview")).toHaveLength(1);
        expect(filterJobs(jobs, "", "interview")[0].stage).toBe("interview");
        expect(filterJobs(jobs, "", "all")).toHaveLength(3);
    });

    it("does not mutate the input array", () => {
        const jobs = [job(), job()];
        const copy = [...jobs];
        filterJobs(jobs, "acme", "all");
        expect(jobs).toEqual(copy);
    });
});

describe("sortJobs", () => {
    it("sorts 'recent' by most recently applied first", () => {
        const jobs = [
            job({ _id: "a", dateApplied: "2024-01-01" }),
            job({ _id: "b", dateApplied: "2024-03-01" }),
            job({ _id: "c", dateApplied: "2024-02-01" }),
        ];
        expect(sortJobs(jobs, "recent").map((j) => j._id)).toEqual(["b", "c", "a"]);
    });

    it("sorts 'company' alphabetically, case-insensitive", () => {
        const jobs = [
            job({ _id: "a", company: "zebra" }),
            job({ _id: "b", company: "Apple" }),
            job({ _id: "c", company: "mango" }),
        ];
        expect(sortJobs(jobs, "company").map((j) => j._id)).toEqual(["b", "c", "a"]);
    });

    it("sorts 'salary' high to low with missing salaries last", () => {
        const jobs = [
            job({ _id: "a", salary: 100 }),
            job({ _id: "b", salary: undefined }),
            job({ _id: "c", salary: 200 }),
        ];
        expect(sortJobs(jobs, "salary").map((j) => j._id)).toEqual(["c", "a", "b"]);
    });

    it("is a stable permutation preserving input order on ties", () => {
        const jobs = [
            job({ _id: "a", company: "Acme" }),
            job({ _id: "b", company: "Acme" }),
            job({ _id: "c", company: "Acme" }),
        ];
        expect(sortJobs(jobs, "company").map((j) => j._id)).toEqual(["a", "b", "c"]);
    });

    it("preserves the same set of items", () => {
        const jobs = [job({ _id: "a" }), job({ _id: "b" }), job({ _id: "c" })];
        const sorted = sortJobs(jobs, "salary");
        expect(sorted).toHaveLength(3);
        expect(new Set(sorted.map((j) => j._id))).toEqual(new Set(["a", "b", "c"]));
    });
});

describe("filterAndSortJobs", () => {
    it("filters then sorts the visible set", () => {
        const jobs = [
            job({ _id: "a", company: "Acme", stage: "applied", salary: 100 }),
            job({ _id: "b", company: "Beta", stage: "applied", salary: 300 }),
            job({ _id: "c", company: "Acme", stage: "offer", salary: 200 }),
        ];
        const result = filterAndSortJobs(jobs, {
            query: "",
            stage: "applied",
            sort: "salary",
        });
        expect(result.map((j) => j._id)).toEqual(["b", "a"]);
    });
});

describe("stage constants", () => {
    it("exposes the canonical seven stages and 'all' as the leading filter", () => {
        expect(JOB_STAGES).toHaveLength(7);
        expect(STAGE_FILTERS[0]).toBe("all");
        expect(STAGE_FILTERS).toHaveLength(8);
    });
});
