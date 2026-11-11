import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import SavedPrep from "../../../models/SavedPrep";
import { NextApiResponse } from "next";
import { withAuth, methodNotAllowed, errorResponse, successResponse, AuthenticatedRequest, isObjectId } from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { syncJobDeleted, syncJobSaved } from "../../../lib/ai-sync";
import { withNormalizedStage } from "../../../lib/job-stage";

// The response is sent first; this only lets background AI sync (waitUntil)
// keep running while a sleeping AI service wakes up.
export const config = { maxDuration: 60 };

const EDITABLE_FIELDS = new Set([
    "title",
    "company",
    "location",
    "stage",
    "status",
    "link",
    "salary",
    "dateApplied",
    "jobDescription",
    "notes",
]);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (!isObjectId(id)) {
        return errorResponse(res, 400, "Invalid job ID");
    }

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed");
    }

    if (req.method === "GET") {
        if (await enforceRateLimit(req, res, { tier: "default", userId })) return;
        try {
            const job = await Job.findOne({ _id: id, userId }).lean();
            if (!job) {
                return errorResponse(res, 404, "Job not found");
            }
            return successResponse(res, withNormalizedStage(job));
        } catch (error) {
            console.error("Error fetching job:", error);
            return errorResponse(res, 500, "Failed to fetch job");
        }
    } 
    
    else if (req.method === "PUT" || req.method === "PATCH") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            // Only user-editable fields; ownership and ids can never be rewritten.
            const update = Object.fromEntries(
                Object.entries(req.body ?? {}).filter(([key]) => EDITABLE_FIELDS.has(key))
            );

            const before = (await Job.findOne({ _id: id, userId }).lean()) as Record<string, unknown> | null;
            const job = await Job.findOneAndUpdate(
                { _id: id, userId },
                update,
                { new: true, runValidators: true }
            );

            if (!before || !job) {
                return errorResponse(res, 404, "Job not found");
            }

            // Re-index only fields whose value actually changed: the UI sends the
            // whole form on every save, and an unchanged title would otherwise
            // re-embed every note of this job (paid work per request).
            const changed = Object.keys(update).filter(
                (key) => JSON.stringify(before[key]) !== JSON.stringify(job.get(key))
            );
            syncJobSaved(userId, job, changed);
            return successResponse(res, withNormalizedStage(job.toObject()));
        } catch (error) {
            if (error instanceof Error && error.name === "ValidationError") {
                return errorResponse(res, 400, error.message);
            }
            console.error("Error updating job:", error);
            return errorResponse(res, 500, "Failed to update job");
        }
    } 
    
    else if (req.method === "DELETE") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const result = await Job.deleteOne({ _id: id, userId });
            await SavedPrep.deleteOne({ userId, jobId: id });

            if (result.deletedCount === 0) {
                return errorResponse(res, 404, "Job not found");
            }
            
            syncJobDeleted(userId, id);
            return successResponse(res, { message: "Job deleted successfully" });
        } catch (error) {
            console.error("Error deleting job:", error);
            return errorResponse(res, 500, "Failed to delete job");
        }
    } 
    
    else {
        return methodNotAllowed(res, ["GET", "PUT", "PATCH", "DELETE"]);
    }
}

export default withAuth(handler);