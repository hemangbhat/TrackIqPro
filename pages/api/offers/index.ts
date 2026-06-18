import { connectDB } from "../../../lib/db";
import Offer from "../../../models/Offer";
import { NextApiResponse } from "next";
import {
    withAuth,
    methodNotAllowed,
    errorResponse,
    successResponse,
    generateId,
    AuthenticatedRequest,
} from "../../../lib/api-helpers";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { userId } = req;

    try {
        await connectDB();
    } catch (error) {
        console.error("Database connection failed:", error);
        return errorResponse(res, 500, "Database connection failed");
    }

    if (req.method === "GET") {
        try {
            const offers = await Offer.find({ userId }).sort({ createdAt: -1 }).lean();
            return successResponse(res, offers);
        } catch (error) {
            console.error("Error fetching offers:", error);
            return errorResponse(res, 500, "Failed to fetch offers");
        }
    }

    if (req.method === "POST") {
        try {
            const {
                company,
                title,
                location,
                salaryBase,
                bonus,
                equity,
                signingBonus,
                ptoDays,
                remoteType,
                benefits,
                techStack,
                growthScore,
                brandScore,
                deadlineDate,
                notes,
            } = req.body;

            if (!company || !title || salaryBase === undefined || salaryBase === null) {
                return errorResponse(
                    res,
                    400,
                    "Company, title, and base salary are required"
                );
            }

            const offer = await Offer.create({
                offerId: generateId("off"),
                userId,
                company,
                title,
                location,
                salaryBase: Number(salaryBase),
                bonus: Number(bonus) || 0,
                equity: Number(equity) || 0,
                signingBonus: Number(signingBonus) || 0,
                ptoDays: Number(ptoDays) || 0,
                remoteType,
                benefits,
                techStack,
                growthScore: growthScore ?? 7,
                brandScore: brandScore ?? 7,
                deadlineDate,
                notes,
                status: "pending",
            });

            return successResponse(res, offer, 201);
        } catch (error) {
            console.error("Error creating offer:", error);
            return errorResponse(res, 500, "Failed to create offer");
        }
    }

    return methodNotAllowed(res, ["GET", "POST"]);
}

export default withAuth(handler);
