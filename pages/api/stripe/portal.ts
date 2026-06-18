import { NextApiResponse, NextApiRequest } from "next";
import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { connectDB } from "../../../lib/db";
import { getUserPlan } from "../../../lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-07-30.basil",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        await connectDB();
        // The customer id is resolved from the signed-in user's own record,
        // never trusted from the client.
        const { customerId } = await getUserPlan(userId);
        if (!customerId) {
            return res.status(400).json({ error: "No billing account found" });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${req.headers.origin}/dashboard/settings`,
        });

        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error("Error creating billing portal session:", error);
        return res.status(500).json({ error: "Failed to open billing portal" });
    }
}
