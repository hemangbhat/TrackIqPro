// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startMemoryMongo, stopMemoryMongo } from "../../../test/mongo-memory";
import CareerProfile from "../../../models/CareerProfile";
import Note from "../../../models/Note";

const scheduled: Promise<unknown>[] = [];
vi.mock("@vercel/functions", () => ({
    waitUntil: vi.fn((p: Promise<unknown>) => {
        scheduled.push(p);
    }),
}));
vi.mock("@clerk/nextjs/server", () => ({ getAuth: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../lib/rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock("../../../lib/ai-client", async () => {
    const actual = await vi.importActual<typeof import("../../../lib/ai-client")>("../../../lib/ai-client");
    return { ...actual, aiConfigured: vi.fn(), indexSources: vi.fn(), deleteSources: vi.fn() };
});

import { getAuth } from "@clerk/nextjs/server";
import * as ai from "../../../lib/ai-client";
import notesHandler from "./index";
import noteHandler from "./[id]";

const mocked = vi.mocked(ai);

function call(handler: (req: never, res: never) => unknown, method: string, body?: unknown, query: object = {}) {
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
    scheduled.length = 0;
    await Promise.all([CareerProfile, Note].map((m) => m.deleteMany({})));
    vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as never);
    mocked.aiConfigured.mockReturnValue(true);
    await CareerProfile.create({ userId: "u1", aiEnabled: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("notes routes sync with the AI index", () => {
    it("note POST still returns 201 when the AI client throws", async () => {
        mocked.indexSources.mockRejectedValue(new ai.AiServiceError(500));
        const r = await call(notesHandler, "POST", { title: "R1", content: "went well" });
        expect(r.status).toBe(201);
        await Promise.all(scheduled);
        expect(console.error).toHaveBeenCalled();
        expect(mocked.indexSources).toHaveBeenCalled();
    });

    it("note PUT re-indexes the updated note", async () => {
        mocked.indexSources.mockResolvedValue(undefined);
        const note = await Note.create({ userId: "u1", title: "old", content: "c" });
        const r = await call(noteHandler, "PUT", { title: "new", content: "c2" }, { id: String(note._id) });
        expect(r.status).toBe(200);
        await Promise.all(scheduled);
        expect(mocked.indexSources.mock.calls[0][1][0]).toMatchObject({ title: "new", sourceId: String(note._id) });
    });

    it("note DELETE removes its vectors, but a 404 delete does not", async () => {
        mocked.deleteSources.mockResolvedValue(undefined);
        const note = await Note.create({ userId: "u1", title: "t", content: "c" });
        expect((await call(noteHandler, "DELETE", undefined, { id: String(note._id) })).status).toBe(200);
        await Promise.all(scheduled.splice(0));
        expect(mocked.deleteSources).toHaveBeenCalledTimes(1);

        expect((await call(noteHandler, "DELETE", undefined, { id: String(note._id) })).status).toBe(404);
        await Promise.all(scheduled.splice(0));
        expect(mocked.deleteSources).toHaveBeenCalledTimes(1);
    });
});
