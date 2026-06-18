import Stripe from "stripe";
import { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-07-30.basil",
});

const PRICE_ID = process.env.STRIPE_PRICE_ID || "price_1RttX9H3uK8I1waI8QkddI8O";

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

    try {
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

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: email,
            line_items: [{ price: PRICE_ID, quantity: 1 }],
            // Metadata on both the session and the subscription so every
            // webhook event type can resolve the user.
            metadata: { userId },
            subscription_data: { metadata: { userId } },
            success_url: `${req.headers.origin}/dashboard?upgrade=success`,
            cancel_url: `${req.headers.origin}/pricing?upgrade=cancel`,
        });

        // IMPORTANT: do not grant the plan here. The user is only upgraded
        // by the Stripe webhook after payment actually succeeds.
        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return res.status(500).json({ error: "Failed to start checkout" });
    }
}
