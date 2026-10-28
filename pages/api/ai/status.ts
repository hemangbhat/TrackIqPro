// pages/api/ai/status.ts
// GET /api/ai/status -> { configured, enabled, remaining }
// Also nudges the AI service awake (it may be cold) so the prep click is fast.

import { NextApiResponse } from "next";
import { waitUntil } from "@vercel/functions";
import { connectDB } from "../../../lib/db";
import CareerProfile from "../../../models/CareerProfile";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    AuthenticatedRequest,
} from "../../../lib/api-helpers";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { aiConfigured, pingHealth } from "../../../lib/ai-client";
import { remainingPreps } from "../../../lib/ai-usage";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
    const { userId } = req;

    if (await enforceRateLimit(req, res, { tier: "default", userId })) return;

    try {
        await connectDB();
        const configured = aiConfigured();
        // Warm-up only: don't wait for it. waitUntil keeps the ping alive after we
        // respond; pingHealth never throws and has its own 3s timeout.
        if (configured) waitUntil(pingHealth());

        const profile = (await CareerProfile.findOne({ userId }).lean()) as { aiEnabled?: boolean } | null;
        return successResponse(res, {
            configured,
            enabled: profile?.aiEnabled === true,
            remaining: await remainingPreps(userId),
        });
    } catch (error) {
        console.error("AI status error:", error);
        return errorResponse(res, 500, "Failed to load AI status", error);
    }
}

export default withAuth(handler);
