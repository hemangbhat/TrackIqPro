import mongoose from "mongoose";

const UserPlanSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    plan: { type: String, default: "free" }, // "free", "pro", "trial", etc.
    customerId: String,
    // The Stripe subscription that currently drives this plan. Webhook events
    // for any other subscription are ignored, so a stale or sibling
    // subscription can never grant or revoke Pro.
    subscriptionId: { type: String, default: null },
    status: { type: String, default: "active" }, // "active", "past_due", "canceled", etc.
    trialEnd: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.UserPlan || mongoose.model("UserPlan", UserPlanSchema);
