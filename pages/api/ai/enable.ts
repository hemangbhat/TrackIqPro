// pages/api/ai/enable.ts
// POST /api/ai/enable { enabled } -> { enabled }
// The consent switch. Turning it on records consent and sends the user's
// existing jobs and notes to the AI service. Turning it off clears the flag,
// then deletes their vectors (restoring the flag if that fails).

import { NextApiResponse } from "next";
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
import { aiConfigured, deleteUserVectors, indexSources, type IndexSource } from "../../../lib/ai-client";
import { jobToSources, noteToSource, type JobLike, type NoteLike } from "../../../lib/ai-sources";

// Initial indexing awaits batched calls to a possibly cold service.
export const config = { maxDuration: 60 };

const BATCH_SIZE = 50;

/** Map every job and note the user owns to index sources. */
async function buildSources(userId: string): Promise<IndexSource[]> {
    const [jobs, notes] = await Promise.all([
        Job.find({ userId }).lean() as unknown as Promise<JobLike[]>,
        Note.find({ userId }).lean() as unknown as Promise<NoteLike[]>,
    ]);
    const jobsById = new Map(jobs.map((j) => [String(j._id), j]));

    const sources = jobs.flatMap(jobToSources);
    for (const note of notes) {
        const source = noteToSource(note, note.jobId ? jobsById.get(String(note.jobId)) : null);
        if (source) sources.push(source);
    }
    return sources;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
    const { userId } = req;

    if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;

    const enabled = (req.body ?? {}).enabled;
    if (typeof enabled !== "boolean") return errorResponse(res, 400, "enabled must be a boolean");

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed", error);
    }

    try {
        if (enabled) {
            if (!aiConfigured()) return errorResponse(res, 503, "AI copilot is not available");

            // Flag first: from here on, job/note saves sync on their own.
            await CareerProfile.findOneAndUpdate(
                { userId },
                { $set: { aiEnabled: true, aiEnabledAt: new Date() } },
                { upsert: true, setDefaultsOnInsert: true }
            );

            try {
                const sources = await buildSources(userId);
                for (let i = 0; i < sources.length; i += BATCH_SIZE) {
                    await indexSources(userId, sources.slice(i, i + BATCH_SIZE));
                }
            } catch (error) {
                // Flag stays on; the reindex script can repair a partial index.
                console.error("AI initial indexing failed:", error);
                return errorResponse(res, 502, "Could not send your data to the AI service. Please try again.");
            }
            return successResponse(res, { enabled: true });
        }

        // Disabling: clear the flag FIRST so no job/note save can re-index this user
        // while we delete. If the delete fails, restore the flag and say so: we never
        // claim data is gone when it is not.
        await CareerProfile.findOneAndUpdate(
            { userId },
            { $set: { aiEnabled: false } },
            { upsert: true, setDefaultsOnInsert: true }
        );
        try {
            await deleteUserVectors(userId);
        } catch (error) {
            console.error("AI vector deletion failed:", error);
            await CareerProfile.updateOne({ userId }, { $set: { aiEnabled: true } });
            return errorResponse(res, 502, "Could not delete your data from the AI service. Please try again.");
        }
        return successResponse(res, { enabled: false });
    } catch (error) {
        console.error("AI enable error:", error);
        return errorResponse(res, 500, "Failed to update AI setting", error);
    }
}

export default withAuth(handler);
