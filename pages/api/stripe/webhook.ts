// pages/api/stripe/webhook.ts
import Stripe from "stripe";
import { buffer } from "micro";
import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import { getPlanSubscriptionId, updateUserPlanInDB } from "../../../lib/stripe";
import { planFromSubscriptionStatus } from "../../../lib/plans";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-07-30.basil",
});

function idOf(ref: string | { id: string } | null | undefined): string | null {
    if (!ref) return null;
    return typeof ref === "string" ? ref : ref.id;
}

/**
 * Write the plan from the subscription's CURRENT state, fetched from Stripe.
 *
 * Stripe does not deliver events in order and retries failures for days, so an
 * event's payload may be stale. Re-fetching makes every event idempotent and
 * order-independent: a late "active" snapshot arriving after cancellation
 * re-reads the subscription, sees it canceled, and leaves the user on Free.
 */
async function syncFromSubscription(userId: string, subscriptionId: string) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const { plan, status } = planFromSubscriptionStatus(sub.status);
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
    await updateUserPlanInDB(userId, plan, idOf(sub.customer), status, trialEnd, sub.id);
}

/**
 * True when an event about `subscriptionId` may change this user's plan: the
 * plan is not bound to a subscription yet, or it is bound to this one. Events
 * for any other (older or parallel) subscription are ignored.
 */
async function isCurrentSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const bound = await getPlanSubscriptionId(userId);
    return !bound || bound === subscriptionId;
}

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
    } catch {
        // Don't echo library error text back to the caller.
        return res.status(400).send("Invalid webhook signature");
    }

    try {
        await connectDB();

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                const subscriptionId = idOf(session.subscription);
                // A completed session that is not paid (e.g. a delayed payment
                // method) must not grant Pro; the subscription events will.
                const paid =
                    session.payment_status === "paid" ||
                    session.payment_status === "no_payment_required";
                if (userId && subscriptionId && paid) {
                    // A new checkout re-binds the plan to the new subscription.
                    await syncFromSubscription(userId, subscriptionId);
                }
                break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const userId = sub.metadata?.userId;
                if (userId && (await isCurrentSubscription(userId, sub.id))) {
                    await syncFromSubscription(userId, sub.id);
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
