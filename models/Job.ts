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
    title: { type: String, required: true, trim: true, maxlength: 200 },
    company: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, trim: true, maxlength: 200 },
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
    // http(s) only: a javascript: URL here would run when the link is clicked.
    link: {
        type: String,
        trim: true,
        maxlength: 2000,
        validate: {
            validator: (v: string) => !v || /^https?:\/\//i.test(v),
            message: "Link must start with http:// or https://",
        },
    },
    salary: { type: Number, min: 0 },
    // Size caps bound storage and the paid embedding work each save triggers.
    jobDescription: { type: String, maxlength: 20000 },
    notes: { type: String, maxlength: 20000 },
    dateApplied: { type: Date, default: Date.now, required: true }
}, {
    timestamps: true
});

// Compound indexes for common queries
JobSchema.index({ userId: 1, createdAt: -1 });
JobSchema.index({ userId: 1, stage: 1 });
JobSchema.index({ userId: 1, company: 1 });

export default mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
