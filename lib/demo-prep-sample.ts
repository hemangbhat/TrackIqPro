// Static sample prep shown on /demo. Written by hand from the demo dataset in
// lib/demo-data.ts; every citation points at a real demo note or job id.
import type { PrepResult } from "./ai-client";

export const DEMO_PREP_SAMPLE: PrepResult = {
    insufficientData: false,
    message: "",
    likelyQuestions: [
        {
            question: "How would you design a cache layer for a collaborative app, and what are the trade-offs?",
            why: "You forgot to discuss caching trade-offs in your Notion system design round, and Linear's role leans on sync and performance.",
            citations: [
                { sourceType: "note", sourceId: "demo-note-3", jobId: "demo-job-4", title: "Notion — system design" },
                { sourceType: "job_description", sourceId: "demo-job-2", jobId: "demo-job-2", title: "Staff Software Engineer — Linear" },
            ],
        },
        {
            question: "Walk me through the time complexity of your solution and how you would optimize it.",
            why: "Complexity analysis slowed you down in the Linear coding round.",
            citations: [{ sourceType: "note", sourceId: "demo-note-2", jobId: "demo-job-2", title: "Linear — coding round" }],
        },
        {
            question: "How do you keep a large React app fast as it grows?",
            why: "You handled the React performance deep-dive well at Vercel, so expect it again at Notion and Ramp.",
            citations: [
                { sourceType: "note", sourceId: "demo-note-5", jobId: "demo-job-1", title: "Vercel — final round" },
                { sourceType: "job_description", sourceId: "demo-job-4", jobId: "demo-job-4", title: "Frontend Engineer — Notion" },
            ],
        },
    ],
    weakSpots: [
        {
            topic: "Edge cases and time management in coding rounds",
            detail: "You ran out of time on the last test case. Start by listing edge cases, then optimize earlier.",
            citations: [{ sourceType: "note", sourceId: "demo-note-2", jobId: "demo-job-2", title: "Linear — coding round" }],
        },
        {
            topic: "Payments domain knowledge",
            detail: "Your Stripe screen went well, but you flagged payments as an area to brush up on.",
            citations: [
                { sourceType: "note", sourceId: "demo-note-1", jobId: "demo-job-3", title: "Stripe — recruiter screen" },
                { sourceType: "job_description", sourceId: "demo-job-3", jobId: "demo-job-3", title: "Full-Stack Engineer — Stripe" },
            ],
        },
    ],
    studyPlan: [
        {
            item: "Revisit scalability patterns: caching, invalidation, and read/write trade-offs.",
            citations: [{ sourceType: "note", sourceId: "demo-note-3", jobId: "demo-job-4", title: "Notion — system design" }],
        },
        {
            item: "Practice three timed coding problems, writing out edge cases before coding.",
            citations: [{ sourceType: "note", sourceId: "demo-note-2", jobId: "demo-job-2", title: "Linear — coding round" }],
        },
        {
            item: "Skim payments basics (idempotency, ledgers, webhooks) before the Stripe loop.",
            citations: [{ sourceType: "job_description", sourceId: "demo-job-3", jobId: "demo-job-3", title: "Full-Stack Engineer — Stripe" }],
        },
    ],
};
