// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CareerProfile from "../../../models/CareerProfile";
import { startMemoryMongo, stopMemoryMongo } from "../../../test/mongo-memory";

vi.mock("@clerk/nextjs/server", () => ({ getAuth: vi.fn() }));
vi.mock("../../../lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

import { getAuth } from "@clerk/nextjs/server";
import { unsubscribeToken } from "../../../lib/unsubscribe";
import unsubscribeHandler from "../../../pages/api/email/unsubscribe";
import preferencesHandler from "../../../pages/api/email-preferences";

function call(
    handler: (req: NextApiRequest, res: NextApiResponse) => unknown,
    { method, query = {}, body }: { method: string; query?: Record<string, string>; body?: unknown }
) {
    const out = { status: 0, body: undefined as any, headers: {} as Record<string, unknown> };
    const res = {
        setHeader(k: string, v: unknown) {
            out.headers[k] = v;
        },
        status(code: number) {
            out.status = code;
            return res;
        },
        json(b: unknown) {
            out.body = b;
            return res;
        },
        end() {
            return res;
        },
    };
    const req = { method, query, body, headers: {} };
    return Promise.resolve(handler(req as any, res as any)).then(() => out);
}

const remindersFor = async (userId: string) =>
    ((await CareerProfile.findOne({ userId }).lean()) as any)?.remindersEnabled;

beforeAll(async () => {
    await startMemoryMongo();
}, 120_000);

afterAll(stopMemoryMongo);

beforeEach(async () => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    await CareerProfile.deleteMany({});
    await CareerProfile.create({ userId: "u1", skills: ["Go"] });
});

describe("POST /api/email/unsubscribe", () => {
    const link = () => ({ u: "u1", t: unsubscribeToken("u1")! });

    it("only accepts POST, so a scanner opening the link changes nothing", async () => {
        const out = await call(unsubscribeHandler, { method: "GET", query: link() });
        expect(out.status).toBe(405);
        expect(await remindersFor("u1")).toBe(true);
    });

    it("rejects a token issued for another user", async () => {
        const out = await call(unsubscribeHandler, {
            method: "POST",
            query: { u: "u1", t: unsubscribeToken("u2")! },
        });
        expect(out.status).toBe(400);
        expect(await remindersFor("u1")).toBe(true);
    });

    it("turns reminders off from the confirm page and redirects back", async () => {
        const out = await call(unsubscribeHandler, { method: "POST", query: link(), body: {} });
        expect(out.status).toBe(303);
        expect(out.headers.Location).toBe("/unsubscribe?done=1");
        expect(await remindersFor("u1")).toBe(false);
        // The rest of the profile is untouched.
        expect(((await CareerProfile.findOne({ userId: "u1" }).lean()) as any).skills).toEqual(["Go"]);
    });

    it("answers a mail client's one-click request with 200", async () => {
        const out = await call(unsubscribeHandler, {
            method: "POST",
            query: link(),
            body: { "List-Unsubscribe": "One-Click" },
        });
        expect(out.status).toBe(200);
        expect(await remindersFor("u1")).toBe(false);
    });
});

describe("/api/email-preferences", () => {
    beforeEach(() => {
        vi.mocked(getAuth).mockReturnValue({ userId: "u1" } as any);
    });

    it("reads the current preference (on by default)", async () => {
        const out = await call(preferencesHandler, { method: "GET" });
        expect(out.body).toEqual({ remindersEnabled: true });
    });

    it("saves a new preference and validates the body", async () => {
        expect((await call(preferencesHandler, { method: "PUT", body: { remindersEnabled: "no" } })).status).toBe(400);
        const out = await call(preferencesHandler, { method: "PUT", body: { remindersEnabled: false } });
        expect(out.body).toEqual({ remindersEnabled: false });
        expect(await remindersFor("u1")).toBe(false);
    });

    it("requires sign-in", async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
        expect((await call(preferencesHandler, { method: "GET" })).status).toBe(401);
    });
});
