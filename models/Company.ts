import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
    companyId: string;
    name: string;
    website?: string;
    industry?: string;
    companySize?: string;
    logo?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>({
    companyId: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    companySize: { 
        type: String, 
        enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"],
    },
    logo: { type: String },
    description: { type: String }
}, {
    timestamps: true
});

CompanySchema.index({ name: 1 });

export default mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);