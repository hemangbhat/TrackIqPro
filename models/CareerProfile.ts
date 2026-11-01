import mongoose from "mongoose";

/**
 * CareerProfile — per-user career inputs that power the Career Intelligence
 * layer (Job Fit scoring). One document per Clerk userId. Contains no identity
 * or entitlement data; purely the user's self-reported skills and targets.
 */
const CareerProfileSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true, unique: true },
        skills: { type: [String], default: [] },
        targetRole: { type: String, default: "" },
        seniority: {
            type: String,
            enum: ["intern", "junior", "mid", "senior", "staff", "lead"],
            default: "mid",
        },
        // Opt-in consent for sending jobs/notes to the AI service (off by default).
        aiEnabled: { type: Boolean, default: false },
        aiEnabledAt: { type: Date, default: null },
        // Set once the initial bulk index finished; lets a repeat "enable" skip
        // re-embedding the whole corpus. Cleared when the user opts out.
        aiIndexedAt: { type: Date, default: null },
        // Daily follow-up reminder digest; turned off from Settings or an email's unsubscribe link.
        remindersEnabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.models.CareerProfile ||
    mongoose.model("CareerProfile", CareerProfileSchema);
