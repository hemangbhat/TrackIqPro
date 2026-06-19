import type { NextApiRequest, NextApiResponse } from "next";
import { clerkClient } from "@clerk/nextjs/server";
import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import { getPriorityQueue } from "../../../lib/follow-up-intelligence";
import { sendFollowUpDigest, emailEnabled } from "../../../lib/email";
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

// Cooldown so a user isn't reminded about the same queue repeatedly. ~20h means
// a daily cron sends at most once per day per user.
const COOLDOWN_SECONDS = 20 * 60 * 60;

function authorized(req: NextApiRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = req.headers.authorization || "";
    return header === `Bearer ${secret}`;
}

/** Optional Upstash-backed dedupe. Returns true if we may send to this user. */
async function claimSend(userId: string): Promise<boolean> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return true; // no dedupe configured → always allow
    try {
        const { Redis } = await import("@upstash/redis");
        const redis = new Redis({ url, token });
        // SET key NX EX cooldown → returns "OK" only if it didn't already exist.
        const res = await redis.set(`reminded:${userId}`, Date.now(), {
            nx: true,
            ex: COOLDOWN_SECONDS,
        });
        return res === "OK";
    } catch {
        return true; // fail open — a dedupe blip shouldn't block reminders
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
            const job: JobType = { ...j, _id: String(j._id) } as JobType;
            const arr = byUser.get(uid);
            if (arr) arr.push(job);
            else byUser.set(uid, [job]);
        }

        const clerk = await clerkClient();
        let usersWithQueue = 0;
        let emailsSent = 0;

        for (const [userId, jobs] of byUser) {
            const queue = getPriorityQueue(jobs, 8);
            if (queue.length === 0) continue;
            usersWithQueue++;

            // Dedupe before doing the (rate-limited) Clerk lookup + send.
            if (!(await claimSend(userId))) continue;

            let email: string | undefined;
            let firstName: string | undefined;
            try {
                const user = await clerk.users.getUser(userId);
                firstName = user.firstName ?? undefined;
                email =
                    user.primaryEmailAddress?.emailAddress ??
                    user.emailAddresses?.[0]?.emailAddress;
            } catch {
                continue; // user no longer exists / not retrievable
            }
            if (!email) continue;

            const result = await sendFollowUpDigest({
                to: email,
                firstName,
                items: queue.map((q) => ({
                    title: q.title,
                    company: q.company,
                    stage: q.stage,
                    action: q.action,
                    daysStale: q.daysStale,
                    impact: q.impact,
                })),
            });
            if (result.sent) emailsSent++;
        }

        return res.status(200).json({
            ok: true,
            usersScanned: byUser.size,
            usersWithFollowUps: usersWithQueue,
            emailsSent,
        });
    } catch (err) {
        console.error("[cron/follow-up-reminders] error:", err);
        return res.status(500).json({ error: "Reminder job failed" });
    }
}
