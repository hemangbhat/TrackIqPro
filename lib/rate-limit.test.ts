// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// Configure Upstash before the module loads so real limiters are built.
process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
process.env.UPSTASH_REDIS_REST_TOKEN = "t";

const prefixes: string[] = [];
vi.mock("@upstash/redis", () => ({ Redis: vi.fn(function () { return {}; }) }));
vi.mock("@upstash/ratelimit", () => {
    const Ratelimit = vi.fn(function (opts: { prefix: string }) {
        prefixes.push(opts.prefix);
        return { limit: vi.fn() };
    }) as unknown as { slidingWindow: (n: number, w: string) => unknown };
    Ratelimit.slidingWindow = vi.fn(() => ({}));
    return { Ratelimit };
});

describe("rate limit tiers", () => {
    it("give each tier its own Redis counter, so reads don't use up the AI limit", async () => {
        await import("./rate-limit");
        expect(prefixes).toHaveLength(4);
        expect(new Set(prefixes).size).toBe(4);
    });
});
