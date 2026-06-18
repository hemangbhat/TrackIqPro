import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
    appId: string;
    userId: string;
    companyId: string;
    roleTitle: string;
    status: "applied" | "screening" | "interview" | "offer" | "rejected" | "accepted" | "withdrawn";
    appliedDate: Date;
    source?: string;
    jobDescription?: string;
    location?: string;
    salary?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>({
    appId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, ref: "User", index: true },
    companyId: { type: String, required: true, ref: "Company" },
    roleTitle: { type: String, required: true, trim: true },
    status: { 
        type: String, 
        enum: ["applied", "screening", "interview", "offer", "rejected", "accepted", "withdrawn"],
        default: "applied",
        required: true
    },
    appliedDate: { type: Date, default: Date.now, required: true },
    source: { type: String, trim: true },
    jobDescription: { type: String },
    location: { type: String, trim: true },
    salary: { type: Number, min: 0 },
    notes: { type: String }
}, {
    timestamps: true
});

ApplicationSchema.index({ userId: 1, appliedDate: -1 });
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ companyId: 1 });

export default mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);