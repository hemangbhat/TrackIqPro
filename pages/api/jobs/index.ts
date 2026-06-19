import { connectDB } from "../../../lib/db";
import Job from "../../../models/Job";
import { NextApiResponse } from "next";
import { withAuth, methodNotAllowed, errorResponse, successResponse, AuthenticatedRequest } from "../../../lib/api-helpers";
import { getUserPlan } from "../../../lib/stripe";
import { enforceRateLimit } from "../../../lib/rate-limit";

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
            
            if (plan === "free") {
                const jobCount = await Job.countDocuments({ userId });
                if (jobCount >= 10) {
                    return errorResponse(res, 403, "Free tier limit reached (10 jobs max)");
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
            return successResponse(res, newJob, 201);
        } catch (error) {
            console.error("Error creating job:", error);
            return errorResponse(res, 500, "Failed to create job");
        }
    }
    
    else {
        return methodNotAllowed(res, ["GET", "POST"]);
    }
}

export default withAuth(handler);