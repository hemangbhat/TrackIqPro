// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startMemoryMongo, stopMemoryMongo } from "../test/mongo-memory";
import CareerProfile from "../models/CareerProfile";
import Job from "../models/Job";
import Note from "../models/Note";

// waitUntil captures the scheduled promise so each test can await the work.
const scheduled: Promise<unknown>[] = [];
vi.mock("@vercel/functions", () => ({
    waitUntil: vi.fn((p: Promise<unknown>) => {
        scheduled.push(p);
    }),
}));
vi.mock("./ai-client", async () => {
    const actual = await vi.importActual<typeof import("./ai-client")>("./ai-client");
    return {
        ...actual,
        aiConfigured: vi.fn(),
        indexSources: vi.fn(),
        deleteSources: vi.fn(),
        deleteUserVectors: vi.fn(),
        pingHealth: vi.fn(),
    };
});

import * as ai from "./ai-client";
import { syncJobDeleted, syncJobSaved, syncNoteDeleted, syncNoteSaved, syncUserDeleted } from "./ai-sync";

const mocked = vi.mocked(ai);
// Background sync waits out a sleeping free-tier service (see ai-sync.ts).
const SLOW = { timeoutMs: 50_000 };

/** Wait for everything handed to waitUntil so far. */
async function flush() {
    await Promise.all(scheduled.splice(0));
}

beforeAll(startMemoryMongo, 120_000);
afterAll(stopMemoryMongo);

beforeEach(async () => {
    vi.clearAllMocks();
    scheduled.length = 0;
    await Promise.all([CareerProfile, Job, Note].map((m) => m.deleteMany({})));
    mocked.aiConfigured.mockReturnValue(true);
    mocked.indexSources.mockResolvedValue(undefined);
    mocked.deleteSources.mockResolvedValue(undefined);
    mocked.deleteUserVectors.mockResolvedValue(undefined);
    mocked.pingHealth.mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ai-sync", () => {
    it("does nothing for a user without aiEnabled", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: false });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme", jobDescription: "jd" });
        syncJobSaved("u1", job);
        syncNoteSaved("u1", { _id: "n1", title: "t", content: "c" });
        syncNoteDeleted("u1", "n1");
        syncJobDeleted("u1", String(job._id));
        await flush();
        expect(mocked.indexSources).not.toHaveBeenCalled();
        expect(mocked.deleteSources).not.toHaveBeenCalled();
    });

    it("does nothing for a user with no profile at all", async () => {
        syncNoteSaved("nobody", { _id: "n1", title: "t", content: "c" });
        syncNoteDeleted("nobody", "n1");
        await flush();
        expect(mocked.indexSources).not.toHaveBeenCalled();
        expect(mocked.deleteSources).not.toHaveBeenCalled();
    });

    it("does nothing when the AI service is not configured", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        mocked.aiConfigured.mockReturnValue(false);
        syncNoteDeleted("u1", "n1");
        syncUserDeleted("u1");
        await flush();
        expect(mocked.deleteSources).not.toHaveBeenCalled();
        expect(mocked.deleteUserVectors).not.toHaveBeenCalled();
    });

    it("job save indexes JD and job notes and re-indexes its notes", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({
            userId: "u1",
            title: "Eng",
            company: "Acme",
            jobDescription: "jd",
            notes: "my notes",
        });
        await Note.create({ userId: "u1", title: "Round 1", content: "c", jobId: String(job._id) });
        await Note.create({ userId: "u1", title: "Other", content: "c", jobId: "someone-else" });

        syncJobSaved("u1", job);
        await flush();

        const sent = mocked.indexSources.mock.calls.flatMap((c) => c[1]);
        expect(sent.map((s) => s.sourceType).sort()).toEqual(["job_description", "job_notes", "note"]);
        expect(sent.find((s) => s.sourceType === "note")?.company).toBe("Acme");
        expect(mocked.deleteSources).not.toHaveBeenCalled();
    });

    it("job save deletes refs for fields that are now empty", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme", jobDescription: "jd" });
        syncJobSaved("u1", job);
        await flush();
        expect(mocked.deleteSources).toHaveBeenCalledWith(
            "u1",
            [{ sourceType: "job_notes", sourceId: String(job._id) }],
            SLOW
        );
    });

    it("job save re-indexes notes in batches of 10", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme" });
        await Note.insertMany(
            Array.from({ length: 21 }, (_, i) => ({ userId: "u1", title: `n${i}`, content: "c", jobId: String(job._id) }))
        );
        syncJobSaved("u1", job);
        await flush();
        const noteBatches = mocked.indexSources.mock.calls.map((c) => c[1].length).filter((n) => n > 0);
        expect(noteBatches).toEqual([10, 10, 1]);
    });

    it("pings the service awake before the first call and uses the long background timeout", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const order: string[] = [];
        mocked.pingHealth.mockImplementation(async () => {
            order.push("ping");
            return false; // still asleep: the sync goes ahead anyway
        });
        mocked.indexSources.mockImplementation(async () => {
            order.push("index");
        });
        syncNoteSaved("u1", { _id: "n1", title: "t", content: "c" });
        await flush();
        expect(order).toEqual(["ping", "index"]);
        expect(mocked.indexSources.mock.calls[0][2]).toEqual(SLOW);
    });

    it("does not ping for a user who has not opted in", async () => {
        syncNoteSaved("nobody", { _id: "n1", title: "t", content: "c" });
        await flush();
        expect(mocked.pingHealth).not.toHaveBeenCalled();
    });

    it("job delete removes only job sources", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        syncJobDeleted("u1", "j1");
        await flush();
        expect(mocked.deleteSources).toHaveBeenCalledWith(
            "u1",
            [
                { sourceType: "job_description", sourceId: "j1" },
                { sourceType: "job_notes", sourceId: "j1" },
            ],
            SLOW
        );
    });

    it("note save indexes the note with its job's company", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme" });
        const note = await Note.create({ userId: "u1", title: "R1", content: "c", jobId: String(job._id) });
        syncNoteSaved("u1", note);
        await flush();
        const [, sources] = mocked.indexSources.mock.calls[0];
        expect(sources[0]).toMatchObject({ sourceType: "note", sourceId: String(note._id), company: "Acme" });
    });

    it("note save with a blank note deletes its ref instead", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        syncNoteSaved("u1", { _id: "n1", title: "  ", content: "" });
        await flush();
        expect(mocked.indexSources).not.toHaveBeenCalled();
        expect(mocked.deleteSources).toHaveBeenCalledWith("u1", [{ sourceType: "note", sourceId: "n1" }], SLOW);
    });

    it("note delete removes the note ref", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        syncNoteDeleted("u1", "n1");
        await flush();
        expect(mocked.deleteSources).toHaveBeenCalledWith("u1", [{ sourceType: "note", sourceId: "n1" }], SLOW);
    });

    it("swallows AI service errors", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        mocked.indexSources.mockRejectedValue(new ai.AiServiceError(500));
        mocked.deleteSources.mockRejectedValue(new ai.AiServiceError(500));
        syncNoteSaved("u1", { _id: "n1", title: "t", content: "c" });
        syncNoteDeleted("u1", "n1");
        await expect(flush()).resolves.toBeUndefined();
        expect(console.error).toHaveBeenCalled();
    });

    it("user deleted removes vectors even without a profile", async () => {
        syncUserDeleted("ghost");
        await flush();
        expect(mocked.deleteUserVectors).toHaveBeenCalledWith("ghost", SLOW);
    });

    it("stops indexing when the user opts out mid-run", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme", jobDescription: "jd" });
        await Note.insertMany(
            Array.from({ length: 60 }, (_, i) => ({ userId: "u1", title: `n${i}`, content: "c", jobId: String(job._id) }))
        );
        // The first index call succeeds, then the user disables the copilot.
        mocked.indexSources.mockImplementationOnce(async () => {
            await CareerProfile.updateOne({ userId: "u1" }, { aiEnabled: false });
        });
        syncJobSaved("u1", job);
        await flush();
        expect(mocked.indexSources).toHaveBeenCalledTimes(1);
    });

    it("a stage-only change makes no index or delete calls", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme", jobDescription: "jd" });
        await Note.create({ userId: "u1", title: "R1", content: "c", jobId: String(job._id) });
        syncJobSaved("u1", job, ["stage"]);
        await flush();
        expect(mocked.indexSources).not.toHaveBeenCalled();
        expect(mocked.deleteSources).not.toHaveBeenCalled();
    });

    it("a description-only change re-indexes the job but not its notes", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme", jobDescription: "jd" });
        await Note.create({ userId: "u1", title: "R1", content: "c", jobId: String(job._id) });
        syncJobSaved("u1", job, ["jobDescription"]);
        await flush();
        const sent = mocked.indexSources.mock.calls.flatMap((c) => c[1]);
        expect(sent.map((s) => s.sourceType)).toEqual(["job_description"]);
    });

    it("a company change re-indexes the notes", async () => {
        await CareerProfile.create({ userId: "u1", aiEnabled: true });
        const job = await Job.create({ userId: "u1", title: "Eng", company: "NewCo" });
        await Note.create({ userId: "u1", title: "R1", content: "c", jobId: String(job._id) });
        syncJobSaved("u1", job, ["company"]);
        await flush();
        const sent = mocked.indexSources.mock.calls.flatMap((c) => c[1]);
        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ sourceType: "note", company: "NewCo" });
    });

    it("logs the userId when an account purge fails", async () => {
        mocked.deleteUserVectors.mockRejectedValue(new ai.AiServiceError(500));
        syncUserDeleted("user_123");
        await flush();
        expect(vi.mocked(console.error).mock.calls[0][0]).toContain("user_123");
    });
});
