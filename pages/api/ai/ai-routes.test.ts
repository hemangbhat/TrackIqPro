// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { startMemoryMongo, stopMemoryMongo } from "../../../test/mongo-memory";
import CareerProfile from "../../../models/CareerProfile";
import Job from "../../../models/Job";
import Note from "../../../models/Note";
import AiUsage from "../../../models/AiUsage";
import { remainingPreps } from "../../../lib/ai-usage";
import type { PrepResult } from "../../../lib/ai-client";

vi.mock("@clerk/nextjs/server", () => ({ getAuth: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../lib/ai-client", async () => {
    const actual = await vi.importActual<typeof import("../../../lib/ai-client")>("../../../lib/ai-client");
    return {
        ...actual,
        aiConfigured: vi.fn(),
        indexSources: vi.fn(),
        deleteUserVectors: vi.fn(),
        requestPrep: vi.fn(),
        pingHealth: vi.fn(),
    };
});

import { getAuth } from "@clerk/nextjs/server";
import * as ai from "../../../lib/ai-client";
import prepHandler from "./prep";
import statusHandler from "./status";
import enableHandler from "./enable";

const mocked = vi.mocked(ai);

/** Minimal req/res pair: enough of the Next API surface for these handlers. */
function call(
    handler: (req: NextApiRequest, res: NextApiResponse) => unknown,
    method: string,
    body?: unknown
) {
    const out = { status: 0, body: undefined as any };
    const res = {
        setHeader: vi.fn(),
        status(code: number) {
            out.status = code;
            return res;
        },
        json(b: unknown) {
            out.body = b;
            return res;
        },
    };
    const req = { method, body, query: {}, headers: {} };
    return Promise.resolve(handler(req as any, res as any)).then(() => out);
}

function prepResult(over: Partial<PrepResult> = {}): PrepResult {
    return { insufficientData: false, message: "", likelyQuestions: [], weakSpots: [], studyPlan: [], ...over };
}

let jobId: string;

beforeAll(async () => {
    await startMemoryMongo();
    await AiUsage.init();
}, 120_000);

afterAll(stopMemoryMongo);

beforeEach(async () => {
    vi.clearAllMocks();
    await Promise.all([CareerProfile, Job, Note, AiUsage].map((m) => m.deleteMany({})));
    vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as any);
    mocked.aiConfigured.mockReturnValue(true);
    mocked.pingHealth.mockResolvedValue(true);
    mocked.indexSources.mockResolvedValue(undefined);
    mocked.deleteUserVectors.mockResolvedValue(undefined);
    await CareerProfile.create({ userId: "u1", aiEnabled: true });
    const job = await Job.create({ userId: "u1", title: "Engineer", company: "Acme", jobDescription: "Build things" });
    jobId = String(job._id);
});

const prep = (body: unknown) => call(prepHandler, "POST", body);

describe("POST /api/ai/prep", () => {
    it("rejects unauthenticated", async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
        expect((await prep({ jobId })).status).toBe(401);
    });

    it("returns 400 for a missing jobId and 404 for a malformed one", async () => {
        expect((await prep({})).status).toBe(400);
        expect((await prep({ jobId: "   " })).status).toBe(400);
        expect((await prep({ jobId: "not-an-id" })).status).toBe(404);
    });

    it("returns 503 when AI is not configured", async () => {
        mocked.aiConfigured.mockReturnValue(false);
        expect((await prep({ jobId })).status).toBe(503);
    });

    it("returns 403 when not enabled", async () => {
        await CareerProfile.updateOne({ userId: "u1" }, { aiEnabled: false });
        const r = await prep({ jobId });
        expect(r.status).toBe(403);
        expect(r.body).toEqual({ error: "AI copilot is not enabled" });
        expect(mocked.requestPrep).not.toHaveBeenCalled();
    });

    it("returns 404 for another user's job without consuming usage", async () => {
        const other = await Job.create({ userId: "u2", title: "X", company: "Y" });
        const r = await prep({ jobId: String(other._id) });
        expect(r.status).toBe(404);
        expect(await remainingPreps("u1")).toBe(5);
        expect(mocked.requestPrep).not.toHaveBeenCalled();
    });

    it("returns the result and remaining count, passing the profile and trimmed focus", async () => {
        await CareerProfile.updateOne({ userId: "u1" }, { skills: ["go"], targetRole: "SRE", seniority: "senior" });
        mocked.requestPrep.mockResolvedValue(
            prepResult({
                studyPlan: [
                    { item: "i", citations: [{ sourceType: "job_description", sourceId: jobId, jobId, title: "t" }] },
                ],
            })
        );
        const r = await prep({ jobId, focus: "  system design  " });
        expect(r.status).toBe(200);
        expect(r.body.remaining).toBe(4);
        expect(r.body.result.studyPlan).toHaveLength(1);
        expect(mocked.requestPrep).toHaveBeenCalledWith({
            userId: "u1",
            jobId,
            jobTitle: "Engineer",
            company: "Acme",
            focus: "system design",
            profile: { skills: ["go"], targetRole: "SRE", seniority: "senior" },
        });
    });

    it("returns 429 with the cap copy after 5 preps", async () => {
        mocked.requestPrep.mockResolvedValue(prepResult());
        for (let i = 0; i < 5; i++) expect((await prep({ jobId })).status).toBe(200);
        const r = await prep({ jobId });
        expect(r.status).toBe(429);
        expect(r.body.error).toBe("You've used today's 5 preps, resets tomorrow");
        expect(mocked.requestPrep).toHaveBeenCalledTimes(5);
    });

    it("refunds usage and returns 503 when the AI service fails", async () => {
        mocked.requestPrep.mockRejectedValue(new ai.AiServiceError(0));
        const r = await prep({ jobId });
        expect(r.status).toBe(503);
        expect(r.body.error).toBe("The AI service is unavailable right now. Please try again in a minute.");
        expect(await remainingPreps("u1")).toBe(5);
    });

    it("drops citations to deleted notes", async () => {
        const live = await Note.create({ userId: "u1", title: "Round 1", content: "x", jobId });
        const liveId = String(live._id);
        const cite = (sourceId: string) => ({ sourceType: "note" as const, sourceId, jobId, title: "t" });
        mocked.requestPrep.mockResolvedValue(
            prepResult({
                likelyQuestions: [
                    { question: "deleted", why: "w", citations: [cite("n1")] },
                    { question: "alive", why: "w", citations: [cite("n1"), cite(liveId)] },
                ],
            })
        );
        const r = await prep({ jobId });
        expect(r.body.result.likelyQuestions.map((q: any) => q.question)).toEqual(["alive"]);
        expect(r.body.result.likelyQuestions[0].citations.map((c: any) => c.sourceId)).toEqual([liveId]);
    });

    it("does not trust another user's note id as a valid citation", async () => {
        const theirs = await Note.create({ userId: "u2", title: "T", content: "x" });
        mocked.requestPrep.mockResolvedValue(
            prepResult({
                weakSpots: [
                    {
                        topic: "t",
                        detail: "d",
                        citations: [{ sourceType: "note", sourceId: String(theirs._id), jobId: "none", title: "t" }],
                    },
                ],
            })
        );
        const r = await prep({ jobId });
        expect(r.body.result.insufficientData).toBe(true);
        expect(r.body.result.message).toBe("Add notes from your rounds to get prep tailored to you");
    });
});

describe("GET /api/ai/status", () => {
    it("reports configured, enabled and remaining, and warms the service", async () => {
        const r = await call(statusHandler, "GET");
        expect(r.body).toEqual({ configured: true, enabled: true, remaining: 5 });
        expect(mocked.pingHealth).toHaveBeenCalled();
    });

    it("still reports the profile flag when not configured, without pinging", async () => {
        mocked.aiConfigured.mockReturnValue(false);
        const r = await call(statusHandler, "GET");
        expect(r.body).toEqual({ configured: false, enabled: true, remaining: 5 });
        expect(mocked.pingHealth).not.toHaveBeenCalled();
    });
});

describe("POST /api/ai/enable", () => {
    it("enable true indexes all jobs and notes", async () => {
        await CareerProfile.updateOne({ userId: "u1" }, { aiEnabled: false });
        await Note.insertMany(
            Array.from({ length: 60 }, (_, i) => ({ userId: "u1", title: `n${i}`, content: "c", jobId }))
        );
        const r = await call(enableHandler, "POST", { enabled: true });
        expect(r.status).toBe(200);
        expect(r.body).toEqual({ enabled: true });
        const profile: any = await CareerProfile.findOne({ userId: "u1" }).lean();
        expect(profile.aiEnabled).toBe(true);
        expect(profile.aiEnabledAt).toBeInstanceOf(Date);
        // 1 job_description + 60 notes = 61 sources, sent as batches of 50 and 11.
        const sizes = mocked.indexSources.mock.calls.map((c) => c[1].length);
        expect(sizes).toEqual([50, 11]);
        expect(mocked.indexSources.mock.calls[0][0]).toBe("u1");
    });

    it("enable true returns 503 and leaves the flag off when AI is not configured", async () => {
        await CareerProfile.updateOne({ userId: "u1" }, { aiEnabled: false });
        mocked.aiConfigured.mockReturnValue(false);
        const r = await call(enableHandler, "POST", { enabled: true });
        expect(r.status).toBe(503);
        expect(((await CareerProfile.findOne({ userId: "u1" }).lean()) as any).aiEnabled).toBe(false);
    });

    it("enable true returns 502 but keeps the flag on when indexing fails", async () => {
        await CareerProfile.updateOne({ userId: "u1" }, { aiEnabled: false });
        mocked.indexSources.mockRejectedValue(new ai.AiServiceError(500));
        const r = await call(enableHandler, "POST", { enabled: true });
        expect(r.status).toBe(502);
        expect(((await CareerProfile.findOne({ userId: "u1" }).lean()) as any).aiEnabled).toBe(true);
    });

    it("enable false deletes vectors and clears flag", async () => {
        const r = await call(enableHandler, "POST", { enabled: false });
        expect(r.body).toEqual({ enabled: false });
        expect(mocked.deleteUserVectors).toHaveBeenCalledWith("u1");
        expect(((await CareerProfile.findOne({ userId: "u1" }).lean()) as any).aiEnabled).toBe(false);
    });

    it("enable false returns 502 and leaves the flag on when vector deletion fails", async () => {
        mocked.deleteUserVectors.mockRejectedValue(new ai.AiServiceError(0));
        const r = await call(enableHandler, "POST", { enabled: false });
        expect(r.status).toBe(502);
        expect(((await CareerProfile.findOne({ userId: "u1" }).lean()) as any).aiEnabled).toBe(true);
    });

    it("rejects a non-boolean body with 400", async () => {
        expect((await call(enableHandler, "POST", { enabled: "yes" })).status).toBe(400);
    });
});
