// pages/api/stripe/webhook.ts
import Stripe from "stripe";
import { buffer } from "micro";
import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import { getPlanSubscriptionId, hasPlanRecord, updateUserPlanInDB } from "../../../lib/stripe";
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
    // No row already means Free. Writing one for a non-live subscription would
    // only resurrect a deleted account's billing data: account deletion cancels
    // the subscription, then removes the row, and Stripe's "deleted" event for
    // that cancel arrives afterwards.
    if (plan === "free" && !(await hasPlanRecord(userId))) return;
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
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        // Without it every event fails verification and nobody's plan updates;
        // say so rather than answer an unexplained 400.
        console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set; refusing events");
        return res.status(500).send("Webhook not configured");
    }
    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).send("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
        const rawBody = await buffer(req);
        event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            secret
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
                } else if (!userId || !subscriptionId) {
                    // A paying user who never gets Pro starts here; log the event id.
                    console.warn(`[stripe/webhook] ${event.type} ${event.id} skipped: missing ${userId ? "subscription" : "userId metadata"}`);
                }
                break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const userId = sub.metadata?.userId;
                if (!userId) {
                    console.warn(`[stripe/webhook] ${event.type} ${event.id} skipped: subscription ${sub.id} has no userId metadata`);
                } else if (await isCurrentSubscription(userId, sub.id)) {
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
