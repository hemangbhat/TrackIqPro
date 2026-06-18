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
    },
    { timestamps: true }
);

export default mongoose.models.CareerProfile ||
    mongoose.model("CareerProfile", CareerProfileSchema);
