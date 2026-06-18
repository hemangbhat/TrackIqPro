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

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return errorResponse(res, 400, "Invalid note ID");
    }

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed");
    }

    if (req.method === "GET") {
        try {
            const note = await Note.findOne({ _id: id, userId }).lean();
            if (!note) return errorResponse(res, 404, "Note not found");
            return successResponse(res, note);
        } catch (error) {
            console.error("Note GET error:", error);
            return errorResponse(res, 500, "Failed to fetch note");
        }
    }

    if (req.method === "PUT" || req.method === "PATCH") {
        try {
            const { title, content, round, jobId } = req.body;
            if (!title || !content) {
                return errorResponse(res, 400, "Title and content are required");
            }

            const note = await Note.findOneAndUpdate(
                { _id: id, userId },
                { title, content, round, jobId },
                { new: true, runValidators: true }
            );
            if (!note) return errorResponse(res, 404, "Note not found");
            return successResponse(res, note);
        } catch (error) {
            console.error("Note PUT error:", error);
            return errorResponse(res, 500, "Failed to update note");
        }
    }

    if (req.method === "DELETE") {
        try {
            const result = await Note.deleteOne({ _id: id, userId });
            if (result.deletedCount === 0) {
                return errorResponse(res, 404, "Note not found");
            }
            return successResponse(res, { message: "Note deleted successfully" });
        } catch (error) {
            console.error("Note DELETE error:", error);
            return errorResponse(res, 500, "Failed to delete note");
        }
    }

    return methodNotAllowed(res, ["GET", "PUT", "PATCH", "DELETE"]);
}

export default withAuth(handler);
