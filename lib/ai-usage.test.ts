// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AiUsage from "../models/AiUsage";
import { startMemoryMongo, stopMemoryMongo } from "../test/mongo-memory";
import { DAILY_PREP_LIMIT, consumePrep, refundPrep, remainingPreps, utcDay } from "./ai-usage";

beforeAll(async () => {
    await startMemoryMongo();
    // The unique index must exist before the concurrency test: it is what makes the cap atomic.
    await AiUsage.init();
}, 120_000);

afterAll(async () => {
    vi.useRealTimers();
    await stopMemoryMongo();
});

beforeEach(async () => {
    vi.useRealTimers();
    await AiUsage.deleteMany({});
});

describe("daily prep cap", () => {
    it("allows 5 then blocks the 6th", async () => {
        for (let i = 1; i <= DAILY_PREP_LIMIT; i++) {
            const r = await consumePrep("u1");
            expect(r).toEqual({ allowed: true, remaining: DAILY_PREP_LIMIT - i });
        }
        expect(await consumePrep("u1")).toEqual({ allowed: false, remaining: 0 });
    });

    it("consumes at most 5 even when called concurrently", async () => {
        const results = await Promise.all(Array.from({ length: 8 }, () => consumePrep("u1")));
        expect(results.filter((r) => r.allowed)).toHaveLength(5);
        expect(await remainingPreps("u1")).toBe(0);
    });

    it("refund restores one", async () => {
        for (let i = 0; i < 5; i++) await consumePrep("u1");
        await refundPrep("u1");
        expect(await remainingPreps("u1")).toBe(1);
        expect((await consumePrep("u1")).allowed).toBe(true);
    });

    it("refund never goes below zero", async () => {
        await refundPrep("u1");
        expect(await remainingPreps("u1")).toBe(5);
        await consumePrep("u1");
        await refundPrep("u1");
        await refundPrep("u1");
        expect(await remainingPreps("u1")).toBe(5);
    });

    it("remainingPreps is 5 with no usage and is per user", async () => {
        expect(await remainingPreps("fresh")).toBe(5);
        await consumePrep("u1");
        expect(await remainingPreps("u2")).toBe(5);
    });

    it("a new UTC day resets", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-03-01T23:59:00Z"));
        for (let i = 0; i < 5; i++) await consumePrep("u1");
        expect((await consumePrep("u1")).allowed).toBe(false);
        vi.setSystemTime(new Date("2026-03-02T00:01:00Z"));
        expect(await consumePrep("u1")).toEqual({ allowed: true, remaining: 4 });
    });

    it("utcDay formats as YYYY-MM-DD in UTC", () => {
        expect(utcDay(new Date("2026-03-01T23:59:59Z"))).toBe("2026-03-01");
    });
});
