// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Citation, PrepResult } from "./ai-client";
import { EMPTY_DATA_MESSAGE, filterStaleCitations, normalizePrepResult } from "./ai-citations";

describe("normalizePrepResult", () => {
    it("fills in missing lists and citations", () => {
        const out = normalizePrepResult({ studyPlan: [{ item: "i" }] } as unknown as PrepResult);
        expect(out.likelyQuestions).toEqual([]);
        expect(out.weakSpots).toEqual([]);
        expect(out.studyPlan[0].citations).toEqual([]);
        expect(out.insufficientData).toBe(false);
    });

    it("copes with an empty or null body", () => {
        expect(normalizePrepResult({}).studyPlan).toEqual([]);
        expect(normalizePrepResult(null).message).toBe("");
    });
});

const cite = (sourceType: Citation["sourceType"], sourceId: string, jobId = "j1"): Citation => ({
    sourceType,
    sourceId,
    jobId,
    title: "t",
});

function result(over: Partial<PrepResult> = {}): PrepResult {
    return {
        insufficientData: false,
        message: "",
        likelyQuestions: [],
        weakSpots: [],
        studyPlan: [],
        ...over,
    };
}

describe("filterStaleCitations", () => {
    it("keeps citations whose sources still exist", () => {
        const input = result({
            likelyQuestions: [
                { question: "q", why: "w", citations: [cite("note", "n1"), cite("job_description", "j1")] },
            ],
        });
        const out = filterStaleCitations(input, new Set(["n1"]), new Set(["j1"]));
        expect(out.likelyQuestions[0].citations).toHaveLength(2);
        expect(out.insufficientData).toBe(false);
    });

    it("drops a deleted note citation and removes the item left empty", () => {
        const input = result({
            likelyQuestions: [
                { question: "gone", why: "w", citations: [cite("note", "n1")] },
                { question: "kept", why: "w", citations: [cite("job_notes", "j1")] },
            ],
        });
        const out = filterStaleCitations(input, new Set(), new Set(["j1"]));
        expect(out.likelyQuestions.map((q) => q.question)).toEqual(["kept"]);
    });

    it("keeps an item that still has at least one valid citation", () => {
        const input = result({
            weakSpots: [{ topic: "t", detail: "d", citations: [cite("note", "n1"), cite("note", "n2")] }],
        });
        const out = filterStaleCitations(input, new Set(["n2"]), new Set());
        expect(out.weakSpots[0].citations.map((c) => c.sourceId)).toEqual(["n2"]);
    });

    it("sets insufficientData with the empty-data copy when everything is dropped", () => {
        const input = result({
            studyPlan: [{ item: "i", citations: [cite("note", "n1")] }],
        });
        const out = filterStaleCitations(input, new Set(), new Set());
        expect(out.insufficientData).toBe(true);
        expect(out.message).toBe("Add notes from your rounds to get prep tailored to you");
        expect(out.message).toBe(EMPTY_DATA_MESSAGE);
        expect(out.studyPlan).toEqual([]);
    });

    it("leaves an already-insufficient result untouched", () => {
        const input = result({ insufficientData: true, message: "not enough" });
        const out = filterStaleCitations(input, new Set(), new Set());
        expect(out.message).toBe("not enough");
    });
});
