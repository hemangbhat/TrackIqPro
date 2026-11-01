import { NextApiResponse } from "next";
import { connectDB } from "../../lib/db";
import { withAuth, methodNotAllowed, errorResponse, successResponse, AuthenticatedRequest } from "../../lib/api-helpers";
import { enforceRateLimit } from "../../lib/rate-limit";
import CareerProfile from "../../models/CareerProfile";

/** GET/PUT the signed-in user's email preferences (the follow-up reminder digest). */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;

    try {
        await connectDB();

        if (req.method === "GET") {
            if (await enforceRateLimit(req, res, { tier: "default", userId })) return;
            const profile = (await CareerProfile.findOne({ userId }).select("remindersEnabled").lean()) as {
                remindersEnabled?: boolean;
            } | null;
            return successResponse(res, { remindersEnabled: profile?.remindersEnabled ?? true });
        }

        if (req.method === "PUT") {
            if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
            const { remindersEnabled } = (req.body ?? {}) as { remindersEnabled?: unknown };
            if (typeof remindersEnabled !== "boolean") {
                return errorResponse(res, 400, "remindersEnabled must be true or false");
            }
            await CareerProfile.updateOne(
                { userId },
                { $set: { remindersEnabled } },
                { upsert: true, setDefaultsOnInsert: true }
            );
            return successResponse(res, { remindersEnabled });
        }

        return methodNotAllowed(res, ["GET", "PUT"]);
    } catch (err) {
        return errorResponse(res, 500, "Failed to load or save email preferences", err);
    }
}

export default withAuth(handler);
