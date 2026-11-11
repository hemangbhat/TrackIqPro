import { timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { clerkClient } from "@clerk/nextjs/server";
import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import CareerProfile from "../../../models/CareerProfile";
import { appBaseUrl } from "../../../lib/app-url";
import { unsubscribeLinks } from "../../../lib/unsubscribe";
import { withNormalizedStage } from "../../../lib/job-stage";
import { getPriorityQueue } from "../../../lib/follow-up-intelligence";
import { sendFollowUpDigests, emailEnabled, DIGEST_BATCH_SIZE, type DigestParams } from "../../../lib/email";
import type { Job as JobType } from "../../../types";

/**
 * Scheduled follow-up reminder digest.
 *
 * Triggered by Vercel Cron (see vercel.json). For every user with active
 * applications, it runs the existing follow-up Priority Queue engine and emails
 * a single digest of overdue follow-ups. Per-user dedupe (Upstash, optional)
 * prevents repeat emails within a cooldown window.
 *
 * Security: requires `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends
 * this automatically when CRON_SECRET is set). If CRON_SECRET is unset the
 * endpoint refuses to run, so it can never be triggered anonymously.
 */

// Users are handled in batches: one Clerk lookup and one Resend call per batch
// (instead of one of each per user), so the run fits the time limit at scale.
export const config = { maxDuration: 60 };

// Cooldown so a user isn't reminded about the same queue repeatedly. ~20h means
// a daily cron sends at most once per day per user.
const COOLDOWN_SECONDS = 20 * 60 * 60;

function authorized(req: NextApiRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const supplied = Buffer.from(req.headers.authorization || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    // Constant-time compare so response timing can't leak the secret.
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

type DedupeClient = import("@upstash/redis").Redis;

/** One Upstash client per run (optional; null when dedupe isn't configured). */
async function dedupeClient(): Promise<DedupeClient | null> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    try {
        const { Redis } = await import("@upstash/redis");
        return new Redis({ url, token });
    } catch (err) {
        console.error("[cron/follow-up-reminders] dedupe unavailable; reminders may repeat:", err instanceof Error ? err.message : "unknown");
        return null;
    }
}

/** Optional Upstash-backed dedupe. Returns true if we may send to this user. */
async function claimSend(redis: DedupeClient | null, userId: string): Promise<boolean> {
    if (!redis) return true; // no dedupe configured → always allow
    try {
        // SET key NX EX cooldown → returns "OK" only if it didn't already exist.
        const res = await redis.set(`reminded:${userId}`, Date.now(), {
            nx: true,
            ex: COOLDOWN_SECONDS,
        });
        return res === "OK";
    } catch (err) {
        // Fail open — a dedupe blip shouldn't block reminders — but say so.
        console.error("[cron/follow-up-reminders] dedupe claim failed, sending anyway:", err instanceof Error ? err.message : "unknown");
        return true;
    }
}

/**
 * Undo claims for users whose email didn't go out, so tomorrow's run (or a
 * manual re-run) reaches them instead of skipping them for the cooldown.
 */
async function releaseClaims(redis: DedupeClient | null, userIds: string[]): Promise<void> {
    if (!redis || userIds.length === 0) return;
    try {
        await redis.del(...userIds.map((id) => `reminded:${id}`));
    } catch (err) {
        console.error(
            `[cron/follow-up-reminders] could not release ${userIds.length} claims; those users wait out the cooldown:`,
            err instanceof Error ? err.message : "unknown"
        );
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET" && req.method !== "POST") {
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
    if (!authorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!emailEnabled) {
        return res.status(200).json({ ok: true, skipped: "email-not-configured" });
    }

    try {
        await connectDB();

        // Pull active jobs and group by user. Capped for safety on large datasets.
        const activeJobs = await Job.find({ status: "active" })
            .select("userId title company stage status updatedAt dateApplied")
            .limit(20000)
            .lean();

        const byUser = new Map<string, JobType[]>();
        for (const j of activeJobs as unknown as (JobType & { _id: unknown })[]) {
            const uid = j.userId;
            if (!uid) continue;
            const job: JobType = withNormalizedStage({ ...j, _id: String(j._id) }) as JobType;
            const arr = byUser.get(uid);
            if (arr) arr.push(job);
            else byUser.set(uid, [job]);
        }

        const candidates: { userId: string; queue: ReturnType<typeof getPriorityQueue> }[] = [];
        for (const [userId, jobs] of byUser) {
            const queue = getPriorityQueue(jobs, 8);
            if (queue.length > 0) candidates.push({ userId, queue });
        }

        const clerk = await clerkClient();
        const redis = await dedupeClient();
        const appUrl = appBaseUrl(req);
        let emailsSent = 0;
        let failedBatches = 0;

        for (let i = 0; i < candidates.length; i += DIGEST_BATCH_SIZE) {
            const batch = candidates.slice(i, i + DIGEST_BATCH_SIZE);

            // Drop users who unsubscribed (before claiming, so no cooldown is spent).
            const optedOut = new Set(
                (
                    (await CareerProfile.find({
                        userId: { $in: batch.map((c) => c.userId) },
                        remindersEnabled: false,
                    })
                        .select("userId")
                        .lean()) as unknown as { userId: string }[]
                ).map((p) => p.userId)
            );
            const chunk = batch.filter((c) => !optedOut.has(c.userId));

            // Dedupe before the Clerk lookup + send; the claims run in parallel.
            const claimed = await Promise.all(chunk.map((c) => claimSend(redis, c.userId)));
            const toSend = chunk.filter((_, j) => claimed[j]);
            if (toSend.length === 0) continue;

            let users;
            try {
                ({ data: users } = await clerk.users.getUserList({
                    userId: toSend.map((c) => c.userId),
                    limit: DIGEST_BATCH_SIZE,
                }));
            } catch (err) {
                console.error("[cron/follow-up-reminders] user lookup failed:", err);
                failedBatches++;
                await releaseClaims(redis, toSend.map((c) => c.userId));
                continue;
            }
            // Users missing from the result no longer exist; skip them.
            const byId = new Map(users.map((u) => [u.id, u]));

            const digests: (DigestParams & { userId: string })[] = toSend.flatMap(({ userId, queue }) => {
                const user = byId.get(userId);
                const email =
                    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
                if (!user || !email) return [];
                return [
                    {
                        userId,
                        to: email,
                        firstName: user.firstName ?? undefined,
                        unsubscribe: unsubscribeLinks(appUrl, userId) ?? undefined,
                        items: queue.map((q) => ({
                            title: q.title,
                            company: q.company,
                            stage: q.stage,
                            action: q.action,
                            daysStale: q.daysStale,
                            impact: q.impact,
                        })),
                    },
                ];
            });
            // A chunk is at most one Resend batch, which succeeds or fails whole.
            const sent = await sendFollowUpDigests(digests.map(({ userId: _u, ...d }) => d));
            emailsSent += sent;
            if (sent < digests.length) {
                failedBatches++;
                await releaseClaims(redis, digests.map((d) => d.userId));
            }
        }

        // 500 on any failed batch so the run shows as failed in Vercel's cron
        // logs, instead of a green "ok" that hides missed reminders.
        return res.status(failedBatches > 0 ? 500 : 200).json({
            ok: failedBatches === 0,
            usersScanned: byUser.size,
            usersWithFollowUps: candidates.length,
            emailsSent,
            failedBatches,
        });
    } catch (err) {
        console.error("[cron/follow-up-reminders] error:", err);
        return res.status(500).json({ error: "Reminder job failed" });
    }
}
