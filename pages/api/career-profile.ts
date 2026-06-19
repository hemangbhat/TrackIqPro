import { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { connectDB } from "../../lib/db";
import CareerProfile from "../../models/CareerProfile";
import { errorResponse, successResponse, methodNotAllowed } from "../../lib/api-helpers";
import { enforceRateLimit } from "../../lib/rate-limit";

const ALLOWED_SENIORITY = ["intern", "junior", "mid", "senior", "staff", "lead"];

interface CareerProfileDoc {
    skills?: string[];
    targetRole?: string;
    seniority?: string;
}

/**
 * GET  /api/career-profile  → the authenticated user's career profile (or a
 *                             default empty profile if none exists yet).
 * PUT  /api/career-profile  → upsert the user's skills / targetRole / seniority.
 *
 * Identity is always derived server-side from Clerk; the body never carries a
 * userId. Profile rows are isolated per user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { userId } = getAuth(req);
    if (!userId) return errorResponse(res, 401, "Unauthorized: Authentication required");

    try {
        await connectDB();

        if (req.method === "GET") {
            if (await enforceRateLimit(req, res, { tier: "default", userId })) return;
            const profile = (await CareerProfile.findOne({ userId }).lean()) as CareerProfileDoc | null;
            return successResponse(res, {
                skills: profile?.skills ?? [],
                targetRole: profile?.targetRole ?? "",
                seniority: profile?.seniority ?? "mid",
            });
        }

        if (req.method === "PUT") {
            if (await enforceRateLimit(req, res, { tier: "mutation", userId })) return;
            const body = (req.body ?? {}) as {
                skills?: unknown;
                targetRole?: unknown;
                seniority?: unknown;
            };

            const skills = Array.isArray(body.skills)
                ? body.skills
                      .filter((s): s is string => typeof s === "string")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 50)
                : [];
            const targetRole =
                typeof body.targetRole === "string" ? body.targetRole.trim().slice(0, 120) : "";
            const seniority =
                typeof body.seniority === "string" && ALLOWED_SENIORITY.includes(body.seniority)
                    ? body.seniority
                    : "mid";

            const updated = (await CareerProfile.findOneAndUpdate(
                { userId },
                { userId, skills, targetRole, seniority },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            ).lean()) as CareerProfileDoc | null;

            return successResponse(res, {
                skills: updated?.skills ?? skills,
                targetRole: updated?.targetRole ?? targetRole,
                seniority: updated?.seniority ?? seniority,
            });
        }

        return methodNotAllowed(res, ["GET", "PUT"]);
    } catch (err) {
        return errorResponse(res, 500, "Failed to load or save career profile", err);
    }
}
