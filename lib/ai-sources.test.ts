import { describe, expect, it } from "vitest";
import { jobSourceRefs, jobToSources, noteToSource } from "./ai-sources";

// Mirrors ai-service/tests/test_reindex.py so both sides map data identically.
const JOB = {
    _id: "job1",
    title: "Backend Engineer",
    company: "Acme",
    createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("jobToSources", () => {
    it("yields nothing without a description or notes", () => {
        expect(jobToSources(JOB)).toEqual([]);
    });

    it("yields a description and a notes source", () => {
        const sources = jobToSources({ ...JOB, jobDescription: "Build APIs", notes: "Referred by Sam" });
        expect(sources.map((s) => s.sourceType)).toEqual(["job_description", "job_notes"]);
        expect(sources.every((s) => s.sourceId === "job1" && s.jobId === "job1")).toBe(true);
        expect(sources[0].text).toBe("Backend Engineer at Acme\n\nBuild APIs");
        expect(sources[1].text).toBe("Backend Engineer at Acme\n\nReferred by Sam");
        expect(sources.every((s) => s.round === "" && s.company === "Acme")).toBe(true);
        expect(sources[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
    });

    it("skips whitespace-only fields", () => {
        expect(jobToSources({ ...JOB, jobDescription: "  \n", notes: " " })).toEqual([]);
    });

    it("accepts ObjectId-like ids", () => {
        const id = { toString: () => "abc123" };
        const [s] = jobToSources({ ...JOB, _id: id, jobDescription: "JD" });
        expect(s.sourceId).toBe("abc123");
    });
});

describe("noteToSource", () => {
    const note = {
        _id: "n1",
        jobId: null,
        title: "Caching",
        content: "Redis TTLs",
        round: "Technical",
        createdAt: new Date("2026-02-01T00:00:00Z"),
    };

    it("gives a note without a job jobId 'none'", () => {
        const s = noteToSource(note)!;
        expect(s.jobId).toBe("none");
        expect(s.sourceType).toBe("note");
        expect(s.sourceId).toBe("n1");
        expect(s.text).toBe("Caching\n\nRedis TTLs");
        expect(s.round).toBe("Technical");
        expect(s.title).toBe("Caching");
        expect(s.company).toBe("");
    });

    it("carries the parent job's company", () => {
        const s = noteToSource({ ...note, jobId: "job1", round: undefined }, JOB)!;
        expect(s.jobId).toBe("job1");
        expect(s.company).toBe("Acme");
        expect(s.round).toBe("");
    });

    it("returns null for an empty note", () => {
        expect(noteToSource({ ...note, title: " ", content: " " })).toBeNull();
    });

    it("keeps a title-only note", () => {
        expect(noteToSource({ ...note, title: "Idea", content: "" })!.text).toBe("Idea\n\n");
    });
});

describe("jobSourceRefs", () => {
    it("covers both job source types", () => {
        expect(jobSourceRefs("job1")).toEqual([
            { sourceType: "job_description", sourceId: "job1" },
            { sourceType: "job_notes", sourceId: "job1" },
        ]);
    });
});
