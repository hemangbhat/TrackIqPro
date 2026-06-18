import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import { NextApiResponse } from "next";
import { withAuth, methodNotAllowed, errorResponse, successResponse, AuthenticatedRequest } from "../../../lib/api-helpers";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return errorResponse(res, 400, "Invalid job ID");
    }

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed");
    }

    if (req.method === "GET") {
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
        try {
            const update = req.body;
            delete update._id;
            delete update.userId;

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