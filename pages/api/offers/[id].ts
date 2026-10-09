import { connectDB } from "../../../lib/db";
import Offer from "../../../models/Offer";
import { NextApiResponse } from "next";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    AuthenticatedRequest,
    isObjectId,
} from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;
    const { id } = req.query;

    if (!isObjectId(id)) {
        return errorResponse(res, 400, "Invalid offer ID");
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
            const offer = await Offer.findOne({ _id: id, userId }).lean();
            if (!offer) return errorResponse(res, 404, "Offer not found");
            return successResponse(res, offer);
        } catch (error) {
            console.error("Error fetching offer:", error);
            return errorResponse(res, 500, "Failed to fetch offer");
        }
    }

    if (req.method === "PUT" || req.method === "PATCH") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const update = { ...req.body };
            delete update._id;
            delete update.userId;
            delete update.offerId;

            const offer = await Offer.findOneAndUpdate({ _id: id, userId }, update, {
                new: true,
                runValidators: true,
            });
            if (!offer) return errorResponse(res, 404, "Offer not found");
            return successResponse(res, offer);
        } catch (error) {
            console.error("Error updating offer:", error);
            return errorResponse(res, 500, "Failed to update offer");
        }
    }

    if (req.method === "DELETE") {
        if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
        try {
            const result = await Offer.deleteOne({ _id: id, userId });
            if (result.deletedCount === 0) {
                return errorResponse(res, 404, "Offer not found");
            }
            return successResponse(res, { message: "Offer deleted successfully" });
        } catch (error) {
            console.error("Error deleting offer:", error);
            return errorResponse(res, 500, "Failed to delete offer");
        }
    }

    return methodNotAllowed(res, ["GET", "PUT", "PATCH", "DELETE"]);
}

export default withAuth(handler);
