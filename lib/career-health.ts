// lib/career-health.ts
// Career Health Score — an explainable composite metric derived from the user's
// job pipeline. Combines response rate, interview conversion, offer conversion,
// application momentum, and follow-up consistency into a 0-100 score with a
// grade and concrete, actionable recommendations.

import { Job } from "../types";
import { getFollowUpSuggestions } from "./insights";

export type HealthGrade = "Excellent" | "Good" | "Needs Improvement";

export interface HealthMetric {
    key: "response" | "interviewConversion" | "offerConversion" | "momentum" | "followUp";
    label: string;
    /** 0-100 sub-score. */
    score: number;
    /** Weight applied to this metric (0..1). */
    weight: number;
    /** Plain-language description of the underlying value. */
    detail: string;
}

export interface Recommendation {
    title: string;
    detail: string;
    priority: "high" | "medium" | "low";
}

export interface CareerHealthResult {
    score: number;
    grade: HealthGrade;
    metrics: HealthMetric[];
    recommendations: Recommendation[];
    summary: string;
}

const RESPONDED_STAGES = new Set(["screening", "interview", "offer", "accepted", "rejected"]);
const INTERVIEW_STAGES = new Set(["interview", "offer", "accepted"]);
const OFFER_STAGES = new Set(["offer", "accepted"]);

function daysSince(date: string | Date | undefined): number {
    if (!date) return Infinity;
    const t = new Date(date).getTime();
    if (isNaN(t)) return Infinity;
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

const WEIGHTS = {
    response: 0.25,
    interviewConversion: 0.25,
    offerConversion: 0.2,
    momentum: 0.15,
    followUp: 0.15,
};

/**
 * Compute the Career Health score and its explainable breakdown.
 *
 * - Response rate: share of applications that got past "applied".
 * - Interview conversion: share of applications reaching interview+.
 * - Offer conversion: share of interviews that became offers.
 * - Momentum: applications created in the trailing 30 days (target ~8+).
 * - Follow-up consistency: inverse of how many stale items are piling up.
 */
export function computeCareerHealth(jobs: Job[]): CareerHealthResult {
    const total = jobs.length;

    if (total === 0) {
        return {
            score: 0,
            grade: "Needs Improvement",
            metrics: [],
            recommendations: [
                {
                    title: "Start tracking applications",
                    detail: "Add your active applications to unlock your Career Health score and personalized guidance.",
                    priority: "high",
                },
            ],
            summary: "No applications yet — add a few to see your career health.",
        };
    }

    const responded = jobs.filter((j) => RESPONDED_STAGES.has(j.stage)).length;
    const reachedInterview = jobs.filter((j) => INTERVIEW_STAGES.has(j.stage)).length;
    const offers = jobs.filter((j) => OFFER_STAGES.has(j.stage)).length;

    const responseRate = responded / total;
    const interviewConv = reachedInterview / total;
    const offerConv = reachedInterview === 0 ? 0 : offers / reachedInterview;

    const recentApps = jobs.filter((j) => daysSince(j.dateApplied || j.createdAt) <= 30).length;
    const momentum = Math.min(1, recentApps / 8); // 8+ apps/month → full marks

    const staleCount = getFollowUpSuggestions(jobs).length;
    const activeInFlight = jobs.filter(
        (j) => j.status === "active" && j.stage !== "applied"
    ).length;
    const followUp =
        activeInFlight === 0
            ? staleCount === 0
                ? 1
                : 0.5
            : Math.max(0, 1 - staleCount / Math.max(activeInFlight, 5));

    const metrics: HealthMetric[] = [
        {
            key: "response",
            label: "Response rate",
            score: Math.round(responseRate * 100),
            weight: WEIGHTS.response,
            detail: `${responded} of ${total} applications advanced past "applied".`,
        },
        {
            key: "interviewConversion",
            label: "Interview conversion",
            score: Math.round(interviewConv * 100),
            weight: WEIGHTS.interviewConversion,
            detail: `${reachedInterview} of ${total} applications reached an interview.`,
        },
        {
            key: "offerConversion",
            label: "Offer conversion",
            score: Math.round(offerConv * 100),
            weight: WEIGHTS.offerConversion,
            detail:
                reachedInterview === 0
                    ? "No interviews yet to convert into offers."
                    : `${offers} of ${reachedInterview} interviews became offers.`,
        },
        {
            key: "momentum",
            label: "Application momentum",
            score: Math.round(momentum * 100),
            weight: WEIGHTS.momentum,
            detail: `${recentApps} application${recentApps === 1 ? "" : "s"} in the last 30 days.`,
        },
        {
            key: "followUp",
            label: "Follow-up consistency",
            score: Math.round(followUp * 100),
            weight: WEIGHTS.followUp,
            detail:
                staleCount === 0
                    ? "No applications are overdue for a follow-up."
                    : `${staleCount} application${staleCount === 1 ? "" : "s"} overdue for a follow-up.`,
        },
    ];

    const score = Math.round(
        metrics.reduce((s, m) => s + m.score * m.weight, 0)
    );
    const grade: HealthGrade =
        score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Improvement";

    return {
        score: Math.max(0, Math.min(100, score)),
        grade,
        metrics,
        recommendations: buildRecommendations(metrics, { recentApps, staleCount, offers }),
        summary: buildSummary(grade, score),
    };
}

function buildRecommendations(
    metrics: HealthMetric[],
    ctx: { recentApps: number; staleCount: number; offers: number }
): Recommendation[] {
    const recs: Recommendation[] = [];
    const by = (k: HealthMetric["key"]) => metrics.find((m) => m.key === k)!;

    if (by("followUp").score < 70 && ctx.staleCount > 0) {
        recs.push({
            title: "Clear your follow-up queue",
            detail: `You have ${ctx.staleCount} application${
                ctx.staleCount === 1 ? "" : "s"
            } going quiet. A timely nudge measurably improves response rates.`,
            priority: "high",
        });
    }
    if (by("momentum").score < 60) {
        recs.push({
            title: "Increase application momentum",
            detail: `Only ${ctx.recentApps} application${
                ctx.recentApps === 1 ? "" : "s"
            } in the last 30 days. Aim for ~8/month to keep your pipeline healthy.`,
            priority: ctx.recentApps === 0 ? "high" : "medium",
        });
    }
    if (by("response").score < 40) {
        recs.push({
            title: "Improve top-of-funnel response",
            detail: "A low response rate often signals resume/role-targeting fit. Tailor applications to roles where your skills match closely.",
            priority: "medium",
        });
    }
    if (by("interviewConversion").score >= 50 && by("offerConversion").score < 40 && ctx.offers === 0) {
        recs.push({
            title: "Sharpen interview conversion",
            detail: "You're reaching interviews but not converting to offers yet. Use the Interview Reflection assistant to find recurring gaps.",
            priority: "medium",
        });
    }
    if (recs.length === 0) {
        recs.push({
            title: "Keep up the momentum",
            detail: "Your pipeline looks healthy. Maintain a steady application and follow-up cadence.",
            priority: "low",
        });
    }
    return recs;
}

function buildSummary(grade: HealthGrade, score: number): string {
    switch (grade) {
        case "Excellent":
            return `Your job search is firing on all cylinders (${score}/100). Stay consistent.`;
        case "Good":
            return `A healthy search (${score}/100) with a few areas to tighten up.`;
        default:
            return `Your search needs attention (${score}/100). Focus on the high-priority actions below.`;
    }
}
