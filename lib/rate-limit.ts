// lib/rate-limit.ts
// Production rate limiting for API routes, backed by Upstash Redis (works
// reliably across serverless instances on Vercel).
//
// Safe-by-default: if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not
// configured, rate limiting is a transparent no-op (every request is allowed)
// so local dev and unconfigured environments are never blocked. Configure the
// two env vars to switch it on with zero code changes.

import type { NextApiRequest, NextApiResponse } from "next";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Whether durable rate limiting is configured for this environment. */
export const rateLimitEnabled = Boolean(url && token);

// A small set of named limiters. Sliding-window keeps bursts smooth. Created
// lazily and only when Upstash is configured.
const redis = rateLimitEnabled ? new Redis({ url: url!, token: token! }) : null;

function makeLimiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
    if (!redis) return null;
    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(tokens, window),
        analytics: false,
        prefix: "trackiq/rl",
    });
}

export type LimitTier = "default" | "mutation" | "billing";

// Tiered limits: reads are generous, mutations tighter, billing strictest.
const limiters: Record<LimitTier, Ratelimit | null> = {
    default: makeLimiter(120, "1 m"), // 120 req/min per identity
    mutation: makeLimiter(40, "1 m"), // 40 writes/min
    billing: makeLimiter(8, "1 m"), // 8 checkout/portal starts/min
};

/** Best-effort client identifier: authenticated userId if present, else IP. */
function identify(req: NextApiRequest, userId?: string): string {
    if (userId) return `u:${userId}`;
    const fwd = req.headers["x-forwarded-for"];
    const ip = Array.isArray(fwd) ? fwd[0] : (fwd || "").split(",")[0].trim();
    return `ip:${ip || req.socket?.remoteAddress || "unknown"}`;
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Check (and consume) a rate-limit token for the given request. Returns
 * `{ success: true }` immediately when rate limiting is disabled. Sets the
 * standard `RateLimit-*` response headers when a limiter is active.
 *
 * On any limiter error we fail OPEN (allow the request) so a Redis blip never
 * takes the API down.
 */
export async function checkRateLimit(
    req: NextApiRequest,
    res: NextApiResponse,
    opts: { tier?: LimitTier; userId?: string } = {}
): Promise<RateLimitResult> {
    const tier = opts.tier ?? "default";
    const limiter = limiters[tier];
    if (!limiter) {
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }
    try {
        const id = identify(req, opts.userId);
        const r = await limiter.limit(id);
        res.setHeader("RateLimit-Limit", String(r.limit));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, r.remaining)));
        res.setHeader("RateLimit-Reset", String(Math.ceil(r.reset / 1000)));
        if (!r.success) {
            const retryAfter = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
            res.setHeader("Retry-After", String(retryAfter));
        }
        return r;
    } catch {
        // Fail open — never block legitimate traffic on a limiter outage.
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }
}

/**
 * Convenience guard for API handlers. Returns `true` and sends a 429 response
 * when the caller is over the limit; returns `false` when the request may
 * proceed. Usage:
 *
 *   if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
 */
export async function enforceRateLimit(
    req: NextApiRequest,
    res: NextApiResponse,
    opts: { tier?: LimitTier; userId?: string } = {}
): Promise<boolean> {
    const result = await checkRateLimit(req, res, opts);
    if (!result.success) {
        res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
        return true;
    }
    return false;
}
