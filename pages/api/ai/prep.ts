// pages/api/ai/prep.ts
// POST /api/ai/prep  { jobId, focus? }  ->  { result, remaining, savedAt }
// GET  /api/ai/prep?jobId=…             ->  { saved: { result, focus, savedAt, stale } | null }
// POST enforces, in order: auth, rate limit, AI configured, user opt-in, job
// ownership, daily cap. Then calls the AI service, drops citations to sources
// deleted since indexing, and saves the result so a reload can show it again.

import { NextApiResponse } from "next";
import mongoose from "mongoose";
import { connectDB } from "../../../lib/db";
import CareerProfile from "../../../models/CareerProfile";
import Job from "../../../models/Job";
import Note from "../../../models/Note";
import SavedPrep from "../../../models/SavedPrep";
import type { PrepResult } from "../../../lib/ai-client";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    AuthenticatedRequest,
} from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { AiServiceError, aiConfigured, requestPrep } from "../../../lib/ai-client";
import { consumePrep, refundPrep } from "../../../lib/ai-usage";
import { filterStaleCitations, normalizePrepResult } from "../../../lib/ai-citations";

// The AI call can take up to ~55s (see PREP_TIMEOUT_MS in lib/ai-client.ts).
export const config = { maxDuration: 60 };

const CAP_MESSAGE = "You've used today's 5 preps, resets tomorrow";
const UNAVAILABLE_MESSAGE = "The AI service is unavailable right now. Please try again in a minute.";

/** Ids that are valid ObjectIds; anything else cannot exist in Mongo, so it counts as missing. */
function validObjectIds(ids: string[]): string[] {
    return ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
}

/** Drop citations to notes/jobs that no longer exist (or aren't this user's). */
async function dropDeletedCitations(userId: string, result: PrepResult): Promise<PrepResult> {
    const cited = [
        ...result.likelyQuestions.flatMap((q) => q.citations),
        ...result.weakSpots.flatMap((w) => w.citations),
        ...result.studyPlan.flatMap((s) => s.citations),
    ];
    const noteIds = validObjectIds([...new Set(cited.filter((c) => c.sourceType === "note").map((c) => c.sourceId))]);
    const jobIds = validObjectIds([...new Set(cited.filter((c) => c.sourceType !== "note").map((c) => c.sourceId))]);
    // Query by userId too, so an id belonging to someone else never counts as existing.
    const [notes, jobs] = await Promise.all([
        Note.find({ _id: { $in: noteIds }, userId }).select("_id").lean(),
        Job.find({ _id: { $in: jobIds }, userId }).select("_id").lean(),
    ]);
    return filterStaleCitations(
        result,
        new Set(notes.map((n) => String(n._id))),
        new Set(jobs.map((j) => String(j._id)))
    );
}

/** GET: the saved prep for one job, with `stale` set if the job or its notes changed since. */
async function getSaved(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;
    if (await enforceRateLimit(req, res, { tier: "default", userId })) return;
    const jobId = typeof req.query.jobId === "string" ? req.query.jobId.trim() : "";
    if (!jobId) return errorResponse(res, 400, "jobId is required");
    try {
        await connectDB();
        const saved = (await SavedPrep.findOne({ userId, jobId }).lean()) as {
            result: PrepResult;
            focus?: string;
            updatedAt: Date;
        } | null;
        if (!saved) return successResponse(res, { saved: null });

        const savedAt = new Date(saved.updatedAt);
        const [job, newerNote] = await Promise.all([
            mongoose.Types.ObjectId.isValid(jobId)
                ? (Job.findOne({ _id: jobId, userId }).select("updatedAt").lean() as Promise<{ updatedAt?: Date } | null>)
                : Promise.resolve(null),
            Note.exists({ userId, jobId, updatedAt: { $gt: savedAt } }),
        ]);
        const stale = Boolean(newerNote) || Boolean(job?.updatedAt && new Date(job.updatedAt) > savedAt);
        const result = await dropDeletedCitations(userId, normalizePrepResult(saved.result));
        return successResponse(res, {
            saved: { result, focus: saved.focus ?? "", savedAt: savedAt.toISOString(), stale },
        });
    } catch (error) {
        console.error("Saved prep load failed:", error);
        return errorResponse(res, 500, "Failed to load saved prep", error);
    }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method === "GET") return getSaved(req, res);
    if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);
    const { userId } = req;

    if (await enforceRateLimit(req, res, { tier: "ai", userId })) return;
    if (!aiConfigured()) return errorResponse(res, 503, "AI copilot is not available");

    const body = (req.body ?? {}) as { jobId?: unknown; focus?: unknown };
    if (typeof body.jobId !== "string" || !body.jobId.trim()) {
        return errorResponse(res, 400, "jobId is required");
    }
    const jobId = body.jobId.trim();
    const focus = typeof body.focus === "string" ? body.focus.trim().slice(0, 200) : "";

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed", error);
    }

    try {
        const profile = (await CareerProfile.findOne({ userId }).lean()) as {
            aiEnabled?: boolean;
            skills?: string[];
            targetRole?: string;
            seniority?: string;
        } | null;
        if (!profile?.aiEnabled) return errorResponse(res, 403, "AI copilot is not enabled");

        // A malformed id can never match, so it is a plain 404 rather than a cast error.
        const job = (
            mongoose.Types.ObjectId.isValid(jobId) ? await Job.findOne({ _id: jobId, userId }).lean() : null
        ) as { title: string; company: string } | null;
        if (!job) return errorResponse(res, 404, "Job not found");

        const usage = await consumePrep(userId);
        if (!usage.allowed) return errorResponse(res, 429, CAP_MESSAGE);

        // Everything until we respond can fail after the prep was consumed, so any
        // throw (AI call, malformed payload, citation lookups) refunds it.
        let filtered;
        try {
            const raw = await requestPrep({
                userId,
                jobId,
                jobTitle: job.title,
                company: job.company,
                focus,
                profile: {
                    skills: profile.skills ?? [],
                    targetRole: profile.targetRole ?? "",
                    seniority: profile.seniority ?? "mid",
                },
            });
            // Drop citations to notes/jobs deleted after indexing.
            filtered = await dropDeletedCitations(userId, normalizePrepResult(raw));
        } catch (error) {
            console.error("AI prep failed:", error);
            // The user got nothing, so normally give the prep back (on the day it
            // was taken). Not on a timeout: the service keeps generating, and is
            // billed, after we stop waiting, so refunding would let slow preps
            // bypass the daily spend cap.
            const timedOut = error instanceof AiServiceError && error.timedOut;
            if (!timedOut) {
                try {
                    await refundPrep(userId, usage.date);
                } catch (refundError) {
                    console.error("Prep refund failed:", refundError);
                }
            }
            return errorResponse(res, 503, UNAVAILABLE_MESSAGE);
        }

        // "Not enough data" gives the user nothing (and usually never reaches the
        // model), so it doesn't count against the daily cap.
        let remaining = usage.remaining;
        if (filtered.insufficientData) {
            try {
                await refundPrep(userId, usage.date);
                remaining += 1;
            } catch (refundError) {
                console.error("Prep refund failed:", refundError);
            }
        }

        // Keep the last real prep for this job so a reload shows it again. Best
        // effort: the user already has the result, so a failed save isn't an error.
        let savedAt: string | null = null;
        if (!filtered.insufficientData) {
            try {
                await SavedPrep.updateOne(
                    { userId, jobId },
                    { $set: { focus, result: filtered } },
                    { upsert: true }
                );
                savedAt = new Date().toISOString();
            } catch (saveError) {
                console.error("Saving prep failed:", saveError);
            }
        }

        return successResponse(res, { result: filtered, remaining, savedAt });
    } catch (error) {
        console.error("AI prep error:", error);
        return errorResponse(res, 500, "Failed to generate prep", error);
    }
}

export default withAuth(handler);
