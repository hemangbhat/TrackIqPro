import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import { NextApiResponse } from "next";
import { withAuth, methodNotAllowed, errorResponse, successResponse, AuthenticatedRequest } from "../../../lib/api-helpers";
import { getUserPlan } from "../../../lib/stripe";
import { FREE_JOB_LIMIT } from "../../../lib/plans";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { syncJobSaved } from "../../../lib/ai-sync";

// The response is sent first; this only lets background AI sync (waitUntil)
// keep running while a sleeping AI service wakes up.
export const config = { maxDuration: 60 };

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed");
    }

    if (req.method === "GET") {
        if (await enforceRateLimit(req, res, { tier: "default", userId })) return;
        try {
            const jobs = await Job.find({ userId })
                .sort({ createdAt: -1 })
                .lean();
            return successResponse(res, jobs);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            return errorResponse(res, 500, "Failed to fetch jobs");
        }
    } 
    
    else if (req.method === "POST") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const { plan } = await getUserPlan(userId);
            
            const limitMessage = `Free tier limit reached (${FREE_JOB_LIMIT} jobs max)`;
            if (plan === "free") {
                const jobCount = await Job.countDocuments({ userId });
                if (jobCount >= FREE_JOB_LIMIT) {
                    return errorResponse(res, 403, limitMessage);
                }
            }

            const { title, company, location, stage, status, link, salary, dateApplied, jobDescription, notes } = req.body;
            
            if (!title || !company) {
                return errorResponse(res, 400, "Title and company are required");
            }

            const newJob = new Job({ 
                userId, 
                title, 
                company, 
                location, 
                stage: stage || "applied",
                status: status || "active",
                link, 
                salary, 
                dateApplied: dateApplied || new Date(),
                jobDescription,
                notes
            });
            
            await newJob.save();

            // The count above is check-then-act: concurrent creates can all pass
            // it. Re-check after inserting and roll back our own insert if the
            // limit was crossed, so a burst can never leave more than the limit.
            if (plan === "free") {
                const olderJobs = await Job.countDocuments({
                    userId,
                    _id: { $ne: newJob._id },
                    createdAt: { $lte: newJob.createdAt },
                });
                if (olderJobs >= FREE_JOB_LIMIT) {
                    await Job.deleteOne({ _id: newJob._id, userId });
                    return errorResponse(res, 403, limitMessage);
                }
            }

            syncJobSaved(userId, newJob);
            return successResponse(res, newJob, 201);
        } catch (error) {
            if (error instanceof Error && error.name === "ValidationError") {
                return errorResponse(res, 400, error.message);
            }
            console.error("Error creating job:", error);
            return errorResponse(res, 500, "Failed to create job");
        }
    }
    
    else {
        return methodNotAllowed(res, ["GET", "POST"]);
    }
}

export default withAuth(handler);