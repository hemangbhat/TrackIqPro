// pages/api/stripe/webhook.ts
import Stripe from "stripe";
import { buffer } from "micro";
import { NextApiRequest, NextApiResponse } from "next";
import { updateUserPlanInDB, PlanStatus } from "../../../lib/stripe";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-07-30.basil",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).send("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
        const rawBody = await buffer(req);
        event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).send(`Webhook Error: ${message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                if (userId) {
                    await updateUserPlanInDB(
                        userId,
                        "pro",
                        (session.customer as string) ?? null,
                        "active"
                    );
                }
                break;
            }

            case "customer.subscription.updated": {
                const sub = event.data.object as Stripe.Subscription;
                const userId = sub.metadata?.userId;
                if (userId) {
                    const statusMap: Record<string, PlanStatus> = {
                        active: "active",
                        trialing: "trialing",
                        past_due: "past_due",
                        canceled: "canceled",
                        unpaid: "past_due",
                    };
                    const status = statusMap[sub.status] || "active";
                    const plan =
                        status === "canceled" || status === "past_due" ? "free" : "pro";
                    await updateUserPlanInDB(
                        userId,
                        plan,
                        sub.customer as string,
                        status
                    );
                }
                break;
            }

            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const userId = sub.metadata?.userId;
                if (userId) {
                    await updateUserPlanInDB(
                        userId,
                        "free",
                        sub.customer as string,
                        "canceled"
                    );
                }
                break;
            }
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Webhook handler error:", message);
        return res.status(500).send("Webhook handler failed");
    }
}
