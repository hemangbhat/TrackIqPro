// types/index.ts
export interface Job {
    _id: string;
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
    dateApplied: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Offer {
    _id?: string;
    offerId?: string;
    appId?: string;
    userId?: string;
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
    growthScore?: number;
    brandScore?: number;
    deadlineDate?: Date | string;
    status: "pending" | "accepted" | "rejected";
    notes?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface Note {
    _id: string;
    userId?: string;
    jobId?: string | null;
    round?: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Application {
    _id?: string;
    appId: string;
    userId: string;
    companyId: string;
    roleTitle: string;
    status: "applied" | "screening" | "interview" | "offer" | "rejected" | "accepted" | "withdrawn";
    appliedDate: Date | string;
    source?: string;
    jobDescription?: string;
    location?: string;
    salary?: number;
    notes?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface Company {
    _id?: string;
    companyId: string;
    name: string;
    website?: string;
    industry?: string;
    companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001+";
    logo?: string;
    description?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
