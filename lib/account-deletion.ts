// lib/account-deletion.ts
// Erase everything we hold about a user once Clerk reports the account deleted.
// Server-only. Every step is idempotent, so a webhook retry after a partial
// failure simply finishes the job.

import Stripe from "stripe";
import { connectDB } from "./db";
import Job from "../models/Job";
import Note from "../models/Note";
import Offer from "../models/Offer";
import AiUsage from "../models/AiUsage";
import CareerProfile from "../models/CareerProfile";
import UserPlan from "../models/UserPlan";

// Subscription states that still bill (or could start billing) the customer.
const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

/**
 * Cancel every live subscription on the user's Stripe customer, so a deleted
 * account is never charged again. Looks up by customer (not the stored
 * subscription id) because older plan records predate that field.
 */
async function cancelSubscriptions(customerId: string): Promise<void> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return;
    const stripe = new Stripe(key, { apiVersion: "2025-07-30.basil" });
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    for (const sub of subs.data) {
        if (LIVE_STATUSES.has(sub.status)) await stripe.subscriptions.cancel(sub.id);
    }
}

/** Cancel billing, then delete the user's rows from every collection. Throws on failure. */
export async function deleteAccountData(userId: string): Promise<void> {
    await connectDB();

    // Billing first: if cancelling fails we keep the plan record (and its
    // customer id) so the webhook retry can still find what to cancel.
    const plan = await UserPlan.findOne({ userId }).select("customerId").lean<{ customerId?: string | null }>();
    if (plan?.customerId) await cancelSubscriptions(plan.customerId);

    await Promise.all([
        Job.deleteMany({ userId }),
        Note.deleteMany({ userId }),
        Offer.deleteMany({ userId }),
        AiUsage.deleteMany({ userId }),
        CareerProfile.deleteOne({ userId }),
        UserPlan.deleteOne({ userId }),
    ]);
}
