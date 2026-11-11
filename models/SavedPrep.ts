import mongoose, { Schema } from "mongoose";

// The last successful prep for one job, so a reload doesn't throw it away (and
// cost another of the day's preps). It is private data derived from the user's
// notes, so it is deleted with them: on AI opt-out, job deletion and account
// deletion.
export interface ISavedPrep {
    userId: string;
    jobId: string;
    focus: string;
    result: unknown;
    createdAt: Date;
    updatedAt: Date;
}

const SavedPrepSchema = new Schema<ISavedPrep>(
    {
        userId: { type: String, required: true },
        jobId: { type: String, required: true },
        focus: { type: String, default: "", maxlength: 200 },
        result: { type: Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

// One saved prep per job: a new prep replaces the old one.
SavedPrepSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default mongoose.models.SavedPrep || mongoose.model<ISavedPrep>("SavedPrep", SavedPrepSchema);
