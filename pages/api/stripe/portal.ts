import { NextApiResponse, NextApiRequest } from "next";
import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { connectDB } from "../../../lib/db";
import { getUserPlan } from "../../../lib/stripe";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { appBaseUrl } from "../../../lib/app-url";

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

    if (await enforceRateLimit(req, res, { tier: "billing", userId })) return;

    try {
        await connectDB();
        // The customer id is resolved from the signed-in user's own record,
        // never trusted from the client.
        const { customerId } = await getUserPlan(userId);
        if (!customerId) {
            // Free users never paid, so there is nothing to manage yet.
            return res.status(400).json({ error: "There's no subscription to manage yet. Upgrade to Pro first." });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appBaseUrl(req)}/dashboard/settings`,
        });

        return res.status(200).json({ url: session.url });
    } catch (error) {
        if (isPortalNotConfigured(error)) {
            // Fixed in the Stripe dashboard, not in code: Settings > Billing >
            // Customer portal > Save (separately for test and live mode).
            console.error("Stripe customer portal is not configured. Save it at https://dashboard.stripe.com/settings/billing/portal");
            return res.status(503).json({ error: "Billing management isn't available right now. Please try again later." });
        }
        console.error("Error creating billing portal session:", error);
        return res.status(500).json({ error: "The billing portal couldn't open. Please try again in a minute." });
    }
}

function isPortalNotConfigured(error: unknown): boolean {
    const e = error as { type?: string; message?: string } | null;
    return e?.type === "StripeInvalidRequestError" && /configuration/i.test(e.message ?? "");
}
