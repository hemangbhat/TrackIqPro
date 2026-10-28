// pages/api/ai/prep.ts
// POST /api/ai/prep  { jobId, focus? }  ->  { result, remaining }
// Enforces, in order: auth, rate limit, AI configured, user opt-in, job
// ownership, daily cap. Then calls the AI service and drops citations to
// sources that were deleted since indexing.

import { NextApiResponse } from "next";
import mongoose from "mongoose";
import { connectDB } from "../../../lib/db";
import CareerProfile from "../../../models/CareerProfile";
import Job from "../../../models/Job";
import Note from "../../../models/Note";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    AuthenticatedRequest,
} from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { aiConfigured, requestPrep } from "../../../lib/ai-client";
import { consumePrep, refundPrep } from "../../../lib/ai-usage";
import { filterStaleCitations } from "../../../lib/ai-citations";

// The AI call can take up to ~55s (see PREP_TIMEOUT_MS in lib/ai-client.ts).
export const config = { maxDuration: 60 };

const CAP_MESSAGE = "You've used today's 5 preps, resets tomorrow";
const UNAVAILABLE_MESSAGE = "The AI service is unavailable right now. Please try again in a minute.";

/** Ids that are valid ObjectIds; anything else cannot exist in Mongo, so it counts as missing. */
function validObjectIds(ids: string[]): string[] {
    return ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
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
        const job = mongoose.Types.ObjectId.isValid(jobId) ? await Job.findOne({ _id: jobId, userId }).lean() : null;
        if (!job) return errorResponse(res, 404, "Job not found");

        const usage = await consumePrep(userId);
        if (!usage.allowed) return errorResponse(res, 429, CAP_MESSAGE);

        let result;
        try {
            result = await requestPrep({
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
        } catch (error) {
            // The user got nothing, so give the prep back (on the day it was taken).
            console.error("AI prep failed:", error);
            await refundPrep(userId, usage.date);
            return errorResponse(res, 503, UNAVAILABLE_MESSAGE);
        }

        // Drop citations to notes/jobs deleted after indexing. Query by userId too,
        // so an id belonging to someone else never counts as existing.
        const cited = [
            ...result.likelyQuestions.flatMap((q) => q.citations),
            ...result.weakSpots.flatMap((w) => w.citations),
            ...result.studyPlan.flatMap((s) => s.citations),
        ];
        const noteIds = validObjectIds([...new Set(cited.filter((c) => c.sourceType === "note").map((c) => c.sourceId))]);
        const jobIds = validObjectIds([...new Set(cited.filter((c) => c.sourceType !== "note").map((c) => c.sourceId))]);
        const [notes, jobs] = await Promise.all([
            Note.find({ _id: { $in: noteIds }, userId }).select("_id").lean(),
            Job.find({ _id: { $in: jobIds }, userId }).select("_id").lean(),
        ]);
        const filtered = filterStaleCitations(
            result,
            new Set(notes.map((n) => String(n._id))),
            new Set(jobs.map((j) => String(j._id)))
        );

        return successResponse(res, { result: filtered, remaining: usage.remaining });
    } catch (error) {
        console.error("AI prep error:", error);
        return errorResponse(res, 500, "Failed to generate prep", error);
    }
}

export default withAuth(handler);
