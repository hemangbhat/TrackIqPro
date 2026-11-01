import { NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import Note from "../../../models/Note";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    AuthenticatedRequest,
    isObjectId,
} from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { syncNoteDeleted, syncNoteSaved } from "../../../lib/ai-sync";

// The response is sent first; this only lets background AI sync (waitUntil)
// keep running while a sleeping AI service wakes up.
export const config = { maxDuration: 60 };

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (!isObjectId(id)) {
        return errorResponse(res, 400, "Invalid note ID");
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
            const note = await Note.findOne({ _id: id, userId }).lean();
            if (!note) return errorResponse(res, 404, "Note not found");
            return successResponse(res, note);
        } catch (error) {
            console.error("Note GET error:", error);
            return errorResponse(res, 500, "Failed to fetch note");
        }
    }

    if (req.method === "PUT" || req.method === "PATCH") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const { title, content, round, jobId } = req.body;
            if (!title || !content) {
                return errorResponse(res, 400, "Title and content are required");
            }

            const before = (await Note.findOne({ _id: id, userId }).lean()) as Record<string, unknown> | null;
            const note = await Note.findOneAndUpdate(
                { _id: id, userId },
                { title, content, round, jobId },
                { new: true, runValidators: true }
            );
            if (!before || !note) return errorResponse(res, 404, "Note not found");
            // Skip re-embedding when nothing indexed changed (paid work per save).
            const changed = ["title", "content", "round", "jobId"].some(
                (key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(note.get(key) ?? null)
            );
            if (changed) syncNoteSaved(userId, note);
            return successResponse(res, note);
        } catch (error) {
            if (error instanceof Error && error.name === "ValidationError") {
                return errorResponse(res, 400, error.message);
            }
            console.error("Note PUT error:", error);
            return errorResponse(res, 500, "Failed to update note");
        }
    }

    if (req.method === "DELETE") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const result = await Note.deleteOne({ _id: id, userId });
            if (result.deletedCount === 0) {
                return errorResponse(res, 404, "Note not found");
            }
            syncNoteDeleted(userId, id);
            return successResponse(res, { message: "Note deleted successfully" });
        } catch (error) {
            console.error("Note DELETE error:", error);
            return errorResponse(res, 500, "Failed to delete note");
        }
    }

    return methodNotAllowed(res, ["GET", "PUT", "PATCH", "DELETE"]);
}

export default withAuth(handler);
