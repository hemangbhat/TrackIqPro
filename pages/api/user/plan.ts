import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import { getUserPlan } from "../../../lib/stripe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await connectDB();
        const planData = await getUserPlan(userId);
        return res.status(200).json(planData);
    } catch (error) {
        console.error("Error fetching plan:", error);
        return res.status(500).json({ error: "Failed to fetch plan" });
    }
}
