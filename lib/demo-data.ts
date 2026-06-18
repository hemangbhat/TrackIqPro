// lib/demo-data.ts
// Realistic sample data for Portfolio / Demo mode. Lets recruiters explore the
// full product (jobs, offers, notes, analytics, intelligence) without an
// account. Pure & deterministic-ish (dates are relative to "now" so the demo
// always looks current). Never persisted; never mixed with real user data.

import { Job, Offer, Note } from "../types";
import type { CareerProfile } from "./career-fit";

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

export const DEMO_PROFILE: CareerProfile = {
    skills: ["TypeScript", "React", "Next.js", "Node.js", "SQL", "AWS", "Testing"],
    targetRole: "Senior Frontend Engineer",
    seniority: "senior",
};

export const demoJobs: Job[] = [
    {
        _id: "demo-job-1", userId: "demo", title: "Senior Frontend Engineer", company: "Vercel",
        location: "Remote", stage: "offer", status: "active", salary: 195000,
        jobDescription:
            "Build the Next.js dashboard with TypeScript, React, and Tailwind CSS. Strong system design and testing skills required. GraphQL and Node.js a plus.",
        dateApplied: daysAgo(34), createdAt: daysAgo(34), updatedAt: daysAgo(3),
    },
    {
        _id: "demo-job-2", userId: "demo", title: "Staff Software Engineer", company: "Linear",
        location: "San Francisco, CA", stage: "interview", status: "active", salary: 230000,
        jobDescription:
            "Work across our React + TypeScript app and Rust sync engine. Deep system design, distributed systems, and performance optimization expertise expected.",
        dateApplied: daysAgo(21), createdAt: daysAgo(21), updatedAt: daysAgo(6),
    },
    {
        _id: "demo-job-3", userId: "demo", title: "Full-Stack Engineer", company: "Stripe",
        location: "Remote", stage: "screening", status: "active", salary: 185000,
        jobDescription:
            "Ruby on Rails backend with React frontend. Experience with REST APIs, PostgreSQL, and payments infrastructure. Strong testing culture.",
        dateApplied: daysAgo(12), createdAt: daysAgo(12), updatedAt: daysAgo(7),
    },
    {
        _id: "demo-job-4", userId: "demo", title: "Frontend Engineer", company: "Notion",
        location: "New York, NY", stage: "interview", status: "active", salary: 175000,
        jobDescription:
            "React, TypeScript, and performance-focused frontend work. Care about design systems, accessibility, and testing (Jest/Cypress).",
        dateApplied: daysAgo(18), createdAt: daysAgo(18), updatedAt: daysAgo(2),
    },
    {
        _id: "demo-job-5", userId: "demo", title: "Software Engineer, Platform", company: "Datadog",
        location: "Boston, MA", stage: "applied", status: "active", salary: 170000,
        jobDescription:
            "Go and Kubernetes platform engineering. Build observability tooling at scale. Docker, AWS, and CI/CD experience required.",
        dateApplied: daysAgo(9), createdAt: daysAgo(9), updatedAt: daysAgo(9),
    },
    {
        _id: "demo-job-6", userId: "demo", title: "Senior React Engineer", company: "Figma",
        location: "Remote", stage: "rejected", status: "closed", salary: 200000,
        jobDescription:
            "Canvas-heavy React + TypeScript work with WebGL. Strong JavaScript fundamentals and system design.",
        dateApplied: daysAgo(40), createdAt: daysAgo(40), updatedAt: daysAgo(15),
    },
    {
        _id: "demo-job-7", userId: "demo", title: "Product Engineer", company: "Retool",
        location: "Remote", stage: "accepted", status: "closed", salary: 188000,
        jobDescription:
            "Full-stack product engineering with React, TypeScript, and Node.js. Ship fast, own features end to end.",
        dateApplied: daysAgo(50), createdAt: daysAgo(50), updatedAt: daysAgo(20),
    },
    {
        _id: "demo-job-8", userId: "demo", title: "Frontend Platform Engineer", company: "Ramp",
        location: "New York, NY", stage: "screening", status: "active", salary: 192000,
        jobDescription:
            "Own the React/Next.js component platform. TypeScript, design systems, testing, and CI/CD.",
        dateApplied: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6),
    },
];

export const demoOffers: Offer[] = [
    {
        _id: "demo-offer-1", offerId: "demo-offer-1", userId: "demo", company: "Vercel",
        title: "Senior Frontend Engineer", location: "Remote", salaryBase: 195000, bonus: 20000,
        equity: 60000, signingBonus: 15000, ptoDays: 25, remoteType: "remote",
        techStack: ["TypeScript", "React", "Next.js", "Node.js"], growthScore: 9, brandScore: 8,
        status: "pending", createdAt: daysAgo(3),
    },
    {
        _id: "demo-offer-2", offerId: "demo-offer-2", userId: "demo", company: "Retool",
        title: "Product Engineer", location: "San Francisco, CA", salaryBase: 188000, bonus: 15000,
        equity: 90000, signingBonus: 10000, ptoDays: 20, remoteType: "hybrid",
        techStack: ["TypeScript", "React", "Node.js", "PostgreSQL"], growthScore: 8, brandScore: 7,
        status: "pending", createdAt: daysAgo(8),
    },
    {
        _id: "demo-offer-3", offerId: "demo-offer-3", userId: "demo", company: "Datadog",
        title: "Software Engineer, Platform", location: "Boston, MA", salaryBase: 178000, bonus: 25000,
        equity: 45000, signingBonus: 5000, ptoDays: 18, remoteType: "onsite",
        techStack: ["Go", "Kubernetes", "AWS"], growthScore: 7, brandScore: 9,
        status: "pending", createdAt: daysAgo(5),
    },
];

export const demoNotes: Note[] = [
    {
        _id: "demo-note-1", userId: "demo", jobId: "demo-job-3", round: "Phone screen",
        title: "Stripe — recruiter screen",
        content:
            "Felt confident talking through my React and TypeScript background. Clear communication, good rapport. Need to brush up on payments domain knowledge.",
        createdAt: daysAgo(11),
    },
    {
        _id: "demo-note-2", userId: "demo", jobId: "demo-job-2", round: "Technical",
        title: "Linear — coding round",
        content:
            "Struggled a bit with the time complexity analysis and ran out of time on the last test case. Should practice edge cases and optimize earlier. System design portion went well.",
        createdAt: daysAgo(8),
    },
    {
        _id: "demo-note-3", userId: "demo", jobId: "demo-job-4", round: "Onsite",
        title: "Notion — system design",
        content:
            "Strong, confident system design discussion. Clear thinking out loud. Nervous at the start but settled in. Forgot to discuss caching trade-offs — revisit scalability patterns.",
        createdAt: daysAgo(5),
    },
    {
        _id: "demo-note-4", userId: "demo", jobId: "demo-job-2", round: "Behavioral",
        title: "Linear — behavioral",
        content:
            "Solid STAR stories, felt prepared and comfortable. Good examples of ownership. Communication was clear and concise.",
        createdAt: daysAgo(3),
    },
    {
        _id: "demo-note-5", userId: "demo", jobId: "demo-job-1", round: "Final",
        title: "Vercel — final round",
        content:
            "Nailed the React performance deep-dive. Confident and fluent throughout. Great conversation about Next.js internals and testing strategy.",
        createdAt: daysAgo(2),
    },
];

export interface DemoDataset {
    jobs: Job[];
    offers: Offer[];
    notes: Note[];
    profile: CareerProfile;
}

export function getDemoDataset(): DemoDataset {
    return { jobs: demoJobs, offers: demoOffers, notes: demoNotes, profile: DEMO_PROFILE };
}
