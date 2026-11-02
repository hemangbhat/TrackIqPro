import Stripe from "stripe";
import { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { connectDB } from "../../../lib/db";
import { getUserPlan, isPro } from "../../../lib/stripe";
import { appBaseUrl } from "../../../lib/app-url";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-07-30.basil",
});

const PRICE_ID = process.env.STRIPE_PRICE_ID;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Identity comes from the authenticated session, never the request body.
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (await enforceRateLimit(req, res, { tier: "billing", userId })) return;

    if (!PRICE_ID) {
        console.error("STRIPE_PRICE_ID is not configured");
        return res.status(503).json({ error: "Upgrades aren't available right now. Please try again later." });
    }

    try {
        await connectDB();
        // One subscription per user: a second checkout would bill twice and
        // leave two subscriptions fighting over the same plan record.
        const current = await getUserPlan(userId);
        if (isPro(current.plan)) {
            return res.status(409).json({ error: "You already have an active Pro subscription" });
        }

        let email: string | undefined;
        try {
            const client = await clerkClient();
            const user = await client.users.getUser(userId);
            email =
                user.primaryEmailAddress?.emailAddress ||
                user.emailAddresses[0]?.emailAddress;
        } catch {
            // Non-fatal: Stripe can collect the email on the checkout page.
            email = undefined;
        }

        const base: Stripe.Checkout.SessionCreateParams = {
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: PRICE_ID, quantity: 1 }],
            // Metadata on both the session and the subscription so every
            // webhook event type can resolve the user.
            metadata: { userId },
            subscription_data: { metadata: { userId } },
            success_url: `${appBaseUrl(req)}/dashboard?upgrade=success`,
            cancel_url: `${appBaseUrl(req)}/pricing?upgrade=cancel`,
        };

        let session: Stripe.Checkout.Session;
        try {
            // Reuse the existing Stripe customer so history stays on one record.
            session = await stripe.checkout.sessions.create(
                current.customerId ? { ...base, customer: current.customerId } : { ...base, customer_email: email }
            );
        } catch (error) {
            // A stored customer that Stripe no longer knows (deleted, or from a
            // different Stripe account/mode) must not block the upgrade forever.
            if (!current.customerId || !isMissingCustomer(error)) throw error;
            console.warn("Stored Stripe customer not found; starting checkout with a new customer");
            session = await stripe.checkout.sessions.create({ ...base, customer_email: email });
        }

        // IMPORTANT: do not grant the plan here. The user is only upgraded
        // by the Stripe webhook after payment actually succeeds.
        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return res.status(500).json({ error: "Checkout couldn't start. Please try again in a minute." });
    }
}

function isMissingCustomer(error: unknown): boolean {
    const e = error as { code?: string; param?: string } | null;
    return e?.code === "resource_missing" && e.param === "customer";
}
