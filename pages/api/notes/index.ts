import { NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import Note from "../../../models/Note";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    AuthenticatedRequest,
} from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed", error);
    }

    if (req.method === "GET") {
        if (await enforceRateLimit(req, res, { tier: "default", userId })) return;
        try {
            const { jobId } = req.query;
            const filter: Record<string, unknown> = { userId };
            if (jobId && typeof jobId === "string") filter.jobId = jobId;

            const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();
            return successResponse(res, notes);
        } catch (error) {
            console.error("Notes GET error:", error);
            return errorResponse(res, 500, "Failed to fetch notes");
        }
    }

    if (req.method === "POST") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const { title, content, jobId, round } = req.body;
            if (!title || !content) {
                return errorResponse(res, 400, "Title and content are required");
            }

            const note = await Note.create({
                userId,
                title,
                content,
                jobId: jobId || null,
                round: round || "",
            });
            return successResponse(res, note, 201);
        } catch (error) {
            console.error("Notes POST error:", error);
            return errorResponse(res, 500, "Failed to create note", error);
        }
    }

    return methodNotAllowed(res, ["GET", "POST"]);
}

export default withAuth(handler);
