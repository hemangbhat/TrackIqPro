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
        userId: { type: String, required: true, index: true, immutable: true },
        company: { type: String, required: true, trim: true, maxlength: 200 },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        location: { type: String, trim: true, maxlength: 200 },
        salaryBase: { type: Number, required: true, min: 0 },
        bonus: { type: Number, min: 0, default: 0 },
        equity: { type: Number, min: 0, default: 0 },
        signingBonus: { type: Number, min: 0, default: 0 },
        ptoDays: { type: Number, min: 0, default: 0 },
        remoteType: { type: String, enum: ["onsite", "hybrid", "remote"] },
        benefits: { type: String, maxlength: 5000 },
        techStack: {
            type: [{ type: String, trim: true, maxlength: 60 }],
            validate: {
                validator: (v: string[]) => v.length <= 50,
                message: "At most 50 tech stack entries",
            },
        },
        growthScore: { type: Number, min: 0, max: 10, default: 7 },
        brandScore: { type: Number, min: 0, max: 10, default: 7 },
        deadlineDate: { type: Date },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
            required: true,
        },
        notes: { type: String, maxlength: 20000 },
    },
    { timestamps: true }
);

OfferSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Offer || mongoose.model<IOffer>("Offer", OfferSchema);
