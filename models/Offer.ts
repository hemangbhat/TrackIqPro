import mongoose, { Schema, Document } from "mongoose";

export interface IOffer extends Document {
    offerId: string;
    appId?: string;
    userId: string;
    company: string;
    title: string;
    location?: string;
    salaryBase: number;
    bonus?: number;
    equity?: number;
    signingBonus?: number;
    ptoDays?: number;
    remoteType?: "onsite" | "hybrid" | "remote";
    benefits?: string;
    techStack?: string[];
    // Qualitative 1-10 scores used by the weighted decision engine
    growthScore?: number;
    brandScore?: number;
    deadlineDate?: Date;
    status: "pending" | "accepted" | "rejected";
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
    {
        offerId: { type: String, required: true, unique: true },
        appId: { type: String, default: null },
        userId: { type: String, required: true, index: true },
        company: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        location: { type: String, trim: true },
        salaryBase: { type: Number, required: true, min: 0 },
        bonus: { type: Number, min: 0, default: 0 },
        equity: { type: Number, min: 0, default: 0 },
        signingBonus: { type: Number, min: 0, default: 0 },
        ptoDays: { type: Number, min: 0, default: 0 },
        remoteType: { type: String, enum: ["onsite", "hybrid", "remote"] },
        benefits: { type: String },
        techStack: [{ type: String, trim: true }],
        growthScore: { type: Number, min: 0, max: 10, default: 7 },
        brandScore: { type: Number, min: 0, max: 10, default: 7 },
        deadlineDate: { type: Date },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
            required: true,
        },
        notes: { type: String },
    },
    { timestamps: true }
);

OfferSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Offer || mongoose.model<IOffer>("Offer", OfferSchema);
