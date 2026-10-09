import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import { NextApiResponse } from "next";
import { withAuth, methodNotAllowed, errorResponse, successResponse, AuthenticatedRequest, isObjectId } from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";

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
            return successResponse(res, job);
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

            const job = await Job.findOneAndUpdate(
                { _id: id, userId },
                update,
                { new: true, runValidators: true }
            );
            
            if (!job) {
                return errorResponse(res, 404, "Job not found");
            }
            
            return successResponse(res, job);
        } catch (error) {
            console.error("Error updating job:", error);
            return errorResponse(res, 500, "Failed to update job");
        }
    } 
    
    else if (req.method === "DELETE") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const result = await Job.deleteOne({ _id: id, userId });
            
            if (result.deletedCount === 0) {
                return errorResponse(res, 404, "Job not found");
            }
            
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