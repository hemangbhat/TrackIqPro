// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startMemoryMongo, stopMemoryMongo } from "../../../test/mongo-memory";
import CareerProfile from "../../../models/CareerProfile";
import Job from "../../../models/Job";

const scheduled: Promise<unknown>[] = [];
vi.mock("@vercel/functions", () => ({
    waitUntil: vi.fn((p: Promise<unknown>) => {
        scheduled.push(p);
    }),
}));
vi.mock("@clerk/nextjs/server", () => ({ getAuth: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../lib/rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock("../../../lib/stripe", () => ({ getUserPlan: vi.fn().mockResolvedValue({ plan: "pro" }) }));
vi.mock("../../../lib/ai-client", async () => {
    const actual = await vi.importActual<typeof import("../../../lib/ai-client")>("../../../lib/ai-client");
    return { ...actual, aiConfigured: vi.fn(), indexSources: vi.fn(), deleteSources: vi.fn(), pingHealth: vi.fn() };
});

import { getAuth } from "@clerk/nextjs/server";
import * as ai from "../../../lib/ai-client";
import jobsHandler from "./index";

const mocked = vi.mocked(ai);

function call(handler: (req: never, res: never) => unknown, method: string, body?: unknown) {
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
    return Promise.resolve(handler({ method, body, query: {}, headers: {} } as never, res as never)).then(() => out);
}

beforeAll(startMemoryMongo, 120_000);
afterAll(stopMemoryMongo);

beforeEach(async () => {
    vi.clearAllMocks();
    scheduled.length = 0;
    await Promise.all([CareerProfile, Job].map((m) => m.deleteMany({})));
    vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as never);
    mocked.aiConfigured.mockReturnValue(true);
    mocked.pingHealth.mockResolvedValue(false);
    await CareerProfile.create({ userId: "u1", aiEnabled: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("jobs routes sync with the AI index", () => {
    it("job POST still returns 201 when the AI client throws", async () => {
        mocked.indexSources.mockRejectedValue(new ai.AiServiceError(500));
        mocked.deleteSources.mockRejectedValue(new ai.AiServiceError(500));
        const r = await call(jobsHandler, "POST", { title: "Eng", company: "Acme", jobDescription: "Build APIs" });
        expect(r.status).toBe(201);
        expect(await Job.countDocuments({ userId: "u1" })).toBe(1);
        await Promise.all(scheduled);
        expect(mocked.indexSources).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });
});
