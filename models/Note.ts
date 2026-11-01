import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
    userId: string;
    jobId?: string;
    title: string;
    content: string;
    round?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
    {
        userId: { type: String, required: true, index: true },
        jobId: { type: String, default: null, index: true },
        // Size caps bound storage and the paid embedding work each save triggers.
        title: { type: String, required: true, trim: true, maxlength: 300 },
        content: { type: String, required: true, maxlength: 20000 },
        round: { type: String, trim: true, default: "", maxlength: 100 },
    },
    { timestamps: true }
);

NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ userId: 1, jobId: 1 });

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);
