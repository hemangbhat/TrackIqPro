import mongoose, { Schema, Document } from "mongoose";

/**
 * AiUsage — how many AI prep requests a user has made on one UTC day.
 * One document per (userId, date). The unique index below is what makes the
 * daily cap atomic: see consumePrep in lib/ai-usage.ts.
 */
export interface IAiUsage extends Document {
    userId: string;
    date: string; // YYYY-MM-DD, UTC
    count: number;
}

const AiUsageSchema = new Schema<IAiUsage>(
    {
        userId: { type: String, required: true },
        date: { type: String, required: true },
        count: { type: Number, required: true, default: 0, min: 0 },
    },
    { timestamps: true }
);

// The daily cap depends on this unique index existing in MongoDB: without it two
// concurrent first-preps of the day could create two documents and both pass.
// Mongoose builds it on startup because autoIndex is on by default; keep it on
// (or create the index by hand) in production.
AiUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.AiUsage || mongoose.model<IAiUsage>("AiUsage", AiUsageSchema);
