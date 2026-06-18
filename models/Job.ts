import mongoose, { Schema, Document } from "mongoose";

export interface IJob extends Document {
    userId: string;
    title: string;
    company: string;
    location?: string;
    stage: "applied" | "screening" | "interview" | "offer" | "rejected" | "accepted" | "withdrawn";
    status: "active" | "closed";
    link?: string;
    salary?: number;
    jobDescription?: string;
    notes?: string;
    dateApplied: Date;
    updatedAt: Date;
    createdAt: Date;
}

const JobSchema = new Schema<IJob>({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    stage: { 
        type: String, 
        required: true,
        enum: ["applied", "screening", "interview", "offer", "rejected", "accepted", "withdrawn"],
        default: "applied"
    },
    status: { 
        type: String, 
        required: true,
        enum: ["active", "closed"],
        default: "active"
    },
    link: { type: String, trim: true },
    salary: { type: Number, min: 0 },
    jobDescription: { type: String },
    notes: { type: String },
    dateApplied: { type: Date, default: Date.now, required: true }
}, {
    timestamps: true
});

// Compound indexes for common queries
JobSchema.index({ userId: 1, createdAt: -1 });
JobSchema.index({ userId: 1, stage: 1 });
JobSchema.index({ userId: 1, company: 1 });

export default mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
