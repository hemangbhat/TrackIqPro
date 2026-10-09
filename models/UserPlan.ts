import mongoose from "mongoose";

const UserPlanSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    plan: { type: String, default: "free" }, // "free", "pro", "trial", etc.
    customerId: String,
    status: { type: String, default: "active" }, // "active", "past_due", "canceled", etc.
    trialEnd: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.UserPlan || mongoose.model("UserPlan", UserPlanSchema);
