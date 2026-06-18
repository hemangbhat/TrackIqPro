// lib/follow-up-intelligence.ts
// Follow-up Intelligence — upgrades flat follow-up suggestions into a ranked
// Priority Queue. Each item explains who to follow up with, why, and the
// expected impact, and is sorted by a transparent value score so the highest-
// leverage actions surface first.

import { Job } from "../types";

export type Impact = "high" | "medium" | "low";

export interface PriorityItem {
    jobId: string;
    title: string;
    company: string;
    stage: string;
    daysStale: number;
    /** 0-100 transparent value score used for ordering. */
    value: number;
    impact: Impact;
    /** Who/what to do. */
    action: string;
    /** Why this matters now. */
    why: string;
    /** Expected impact of acting. */
    expectedImpact: string;
}

// Later pipeline stages are worth more to protect; offers are most urgent.
const STAGE_VALUE: Record<string, number> = {
    offer: 100,
    interview: 80,
    screening: 60,
    applied: 35,
};

const STAGE_THRESHOLD: Record<string, number> = {
    applied: 10,
    screening: 5,
    interview: 5,
    offer: 2,
};

function daysSince(date: string | Date | undefined): number {
    if (!date) return 0;
    const t = new Date(date).getTime();
    if (isNaN(t)) return 0;
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

/**
 * Build a ranked follow-up priority queue.
 *
 * Value model (transparent): stage importance (up to 100) scaled by how overdue
 * the item is relative to its stage threshold (urgency multiplier 1.0–2.0).
 * Items not yet overdue are excluded.
 */
export function getPriorityQueue(jobs: Job[], limit = 6): PriorityItem[] {
    const items: PriorityItem[] = [];

    for (const job of jobs) {
        if (job.status !== "active") continue;
        const threshold = STAGE_THRESHOLD[job.stage];
        const stageValue = STAGE_VALUE[job.stage];
        if (!threshold || stageValue == null) continue;

        const stale = daysSince(job.updatedAt || job.dateApplied);
        if (stale < threshold) continue;

        // Urgency multiplier grows with how far past the threshold we are.
        const urgency = Math.min(2, stale / threshold);
        const value = Math.round(Math.min(100, stageValue * (0.5 + urgency * 0.25)));

        const impact: Impact = value >= 80 ? "high" : value >= 55 ? "medium" : "low";

        items.push({
            jobId: job._id,
            title: job.title,
            company: job.company,
            stage: job.stage,
            daysStale: stale,
            value,
            impact,
            action: actionFor(job.stage, job.company),
            why: whyFor(job.stage, stale),
            expectedImpact: impactFor(job.stage),
        });
    }

    return items.sort((a, b) => b.value - a.value || b.daysStale - a.daysStale).slice(0, limit);
}

function actionFor(stage: string, company: string): string {
    switch (stage) {
        case "offer":
            return `Respond to ${company}'s offer or request more time`;
        case "interview":
            return `Send a thank-you / status note to ${company}`;
        case "screening":
            return `Check in with the ${company} recruiter`;
        default:
            return `Follow up on your ${company} application`;
    }
}

function whyFor(stage: string, stale: number): string {
    switch (stage) {
        case "offer":
            return `Offer has been open ${stale} days — deadlines move fast and silence risks the offer.`;
        case "interview":
            return `${stale} days since your interview — a prompt follow-up keeps you top of mind while decisions are made.`;
        case "screening":
            return `${stale} days in screening with no movement — a nudge often unblocks scheduling.`;
        default:
            return `No response ${stale} days after applying — a follow-up can resurface your application.`;
    }
}

function impactFor(stage: string): string {
    switch (stage) {
        case "offer":
            return "Protects a live offer and signals professionalism.";
        case "interview":
            return "Meaningfully improves odds of advancing to an offer.";
        case "screening":
            return "Often unblocks the next interview round.";
        default:
            return "Can convert a silent application into a response.";
    }
}
