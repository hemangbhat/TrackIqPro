// @vitest-environment node
// Regression tests for issues found in the security audit (run 1). Each test
// pins the invariant the fix enforces.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startMemoryMongo, stopMemoryMongo } from "../../test/mongo-memory";
import CareerProfile from "../../models/CareerProfile";
import Job from "../../models/Job";
import Note from "../../models/Note";
import Offer from "../../models/Offer";

vi.mock("@vercel/functions", () => ({ waitUntil: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ getAuth: vi.fn() }));
vi.mock("../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock("../../lib/stripe", () => ({ getUserPlan: vi.fn() }));
vi.mock("../../lib/ai-sync", () => ({
    syncJobSaved: vi.fn(),
    syncJobDeleted: vi.fn(),
    syncNoteSaved: vi.fn(),
    syncNoteDeleted: vi.fn(),
}));

import { getAuth } from "@clerk/nextjs/server";
import { getUserPlan } from "../../lib/stripe";
import { syncJobSaved, syncNoteSaved } from "../../lib/ai-sync";
import offerByIdHandler from "../../pages/api/offers/[id]";
import jobsHandler from "../../pages/api/jobs/index";
import jobByIdHandler from "../../pages/api/jobs/[id]";
import noteByIdHandler from "../../pages/api/notes/[id]";

function call(
    handler: (req: never, res: never) => unknown,
    method: string,
    body?: unknown,
    query: Record<string, string> = {}
) {
    const out = { status: 0, body: undefined as unknown };
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
    return Promise.resolve(handler({ method, body, query, headers: {} } as never, res as never)).then(() => out);
}

beforeAll(startMemoryMongo, 120_000);
afterAll(stopMemoryMongo);

beforeEach(async () => {
    vi.clearAllMocks();
    await Promise.all([CareerProfile, Job, Note, Offer].map((m) => m.deleteMany({})));
    vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as never);
    vi.mocked(getUserPlan).mockResolvedValue({ plan: "free" } as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("offer update cannot change ownership", () => {
    it("ignores a nested $set of userId and other non-editable fields", async () => {
        const offer = await Offer.create({ offerId: "off_1", userId: "u1", company: "Acme", title: "Eng", salaryBase: 100 });
        const r = await call(
            offerByIdHandler,
            "PATCH",
            { $set: { userId: "u2", offerId: "off_x" }, $rename: { notes: "userId" }, userId: "u2", company: "Acme 2" },
            { id: String(offer._id) }
        );
        expect(r.status).toBe(200);
        const stored = (await Offer.findById(offer._id).lean()) as unknown as {
            userId: string;
            offerId: string;
            company: string;
        };
        expect(stored.userId).toBe("u1");
        expect(stored.offerId).toBe("off_1");
        expect(stored.company).toBe("Acme 2");
        expect(await Offer.countDocuments({ userId: "u2" })).toBe(0);
    });
});

describe("free-tier job limit", () => {
    it("holds under a burst of concurrent creates", async () => {
        await Job.insertMany(Array.from({ length: 9 }, (_, i) => ({ userId: "u1", title: `j${i}`, company: "c" })));
        const results = await Promise.all(
            Array.from({ length: 8 }, (_, i) => call(jobsHandler, "POST", { title: `burst${i}`, company: "c" }))
        );
        expect(await Job.countDocuments({ userId: "u1" })).toBeLessThanOrEqual(10);
        expect(results.every((r) => r.status === 201 || r.status === 403)).toBe(true);
    });

    it("does not limit pro users", async () => {
        vi.mocked(getUserPlan).mockResolvedValue({ plan: "pro" } as never);
        await Job.insertMany(Array.from({ length: 10 }, (_, i) => ({ userId: "u1", title: `j${i}`, company: "c" })));
        expect((await call(jobsHandler, "POST", { title: "more", company: "c" })).status).toBe(201);
    });
});

describe("job link scheme", () => {
    it("rejects a javascript: link with 400", async () => {
        const r = await call(jobsHandler, "POST", { title: "t", company: "c", link: "javascript:alert(1)" });
        expect(r.status).toBe(400);
        expect(await Job.countDocuments({ userId: "u1" })).toBe(0);
    });

    it("accepts an https link", async () => {
        const r = await call(jobsHandler, "POST", { title: "t", company: "c", link: "https://example.com/job" });
        expect(r.status).toBe(201);
    });
});

describe("AI sync is only triggered by real changes", () => {
    it("a job PUT with an unchanged title reports no changed fields", async () => {
        const job = await Job.create({ userId: "u1", title: "Eng", company: "Acme", stage: "applied" });
        await call(jobByIdHandler, "PUT", { title: "Eng", company: "Acme", stage: "interview" }, { id: String(job._id) });
        expect(vi.mocked(syncJobSaved).mock.calls[0][2]).toEqual(["stage"]);
    });

    it("a note PUT with identical content does not re-index", async () => {
        const note = await Note.create({ userId: "u1", title: "R1", content: "c", round: "", jobId: null });
        await call(noteByIdHandler, "PUT", { title: "R1", content: "c", round: "", jobId: null }, { id: String(note._id) });
        expect(syncNoteSaved).not.toHaveBeenCalled();
        await call(noteByIdHandler, "PUT", { title: "R1", content: "changed", round: "", jobId: null }, { id: String(note._id) });
        expect(syncNoteSaved).toHaveBeenCalledTimes(1);
    });
});
