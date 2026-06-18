import { Job } from "../types";

export type FollowUpSuggestion = {
    jobId: string;
    title: string;
    company: string;
    stage: string;
    daysStale: number;
    reason: string;
    severity: "high" | "medium";
};

// Stages that are "in flight" and worth following up on, with the number of
// days of silence after which a nudge is warranted.
const FOLLOW_UP_THRESHOLDS: Record<string, number> = {
    applied: 10,
    screening: 5,
    interview: 5,
    offer: 2,
};

function daysSince(date: string | Date | undefined): number {
    if (!date) return 0;
    const then = new Date(date).getTime();
    if (isNaN(then)) return 0;
    return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/**
 * Explainable heuristic: surface applications that have gone quiet for longer
 * than the stage-appropriate threshold, so the user knows where to follow up.
 */
export function getFollowUpSuggestions(jobs: Job[]): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    for (const job of jobs) {
        if (job.status !== "active") continue;
        const threshold = FOLLOW_UP_THRESHOLDS[job.stage];
        if (!threshold) continue;

        const stale = daysSince(job.updatedAt || job.dateApplied);
        if (stale < threshold) continue;

        const reasonByStage: Record<string, string> = {
            applied: `No response ${stale} days after applying — consider a follow-up email.`,
            screening: `${stale} days since your last update in screening — check in with the recruiter.`,
            interview: `${stale} days since your interview update — send a thank-you or status nudge.`,
            offer: `Offer is ${stale} days old — review the deadline and respond.`,
        };

        suggestions.push({
            jobId: job._id,
            title: job.title,
            company: job.company,
            stage: job.stage,
            daysStale: stale,
            reason: reasonByStage[job.stage],
            severity: stale >= threshold * 2 ? "high" : "medium",
        });
    }

    // Most urgent first.
    return suggestions.sort((a, b) => b.daysStale - a.daysStale).slice(0, 5);
}

/* -------------------------------------------------------------------------- */
/*  Dashboard derivations                                                      */
/*                                                                             */
/*  Pure functions that derive the dashboard's KPIs, charts, and activity      */
/*  feed from the jobs array. The presentation layer consumes these outputs    */
/*  directly and performs no independent computation (Requirements 6.1, 6.2,   */
/*  6.3). All counts are non-negative integers and the interview rate is a     */
/*  percentage clamped to the inclusive range 0–100.                           */
/* -------------------------------------------------------------------------- */

export type DashboardKpis = {
    /** Total number of applications (non-negative integer). */
    total: number;
    /** Interview rate as an integer percentage between 0 and 100 inclusive. */
    interviewRate: number;
    /** Number of offers, counting offer + accepted stages (non-negative integer). */
    offers: number;
    /** Number of active applications still in the pipeline (non-negative integer). */
    active: number;
};

/** Stages that represent having reached (or progressed past) an interview. */
const REACHED_INTERVIEW_STAGES = new Set(["interview", "offer", "accepted"]);
const OFFER_STAGES = new Set(["offer", "accepted"]);

/**
 * Derive the four dashboard KPIs from the jobs array. Total, offers, and active
 * are non-negative integer counts; interviewRate is the share of applications
 * that reached the interview stage or beyond, expressed as an integer percent
 * clamped to 0–100.
 */
export function getKpis(jobs: Job[]): DashboardKpis {
    const total = jobs.length;
    const active = jobs.filter((j) => j.status === "active").length;
    const offers = jobs.filter((j) => OFFER_STAGES.has(j.stage)).length;
    const reachedInterview = jobs.filter((j) => REACHED_INTERVIEW_STAGES.has(j.stage)).length;
    const interviewRate = total === 0 ? 0 : Math.round((reachedInterview / total) * 100);

    return {
        total,
        active,
        offers,
        interviewRate: Math.max(0, Math.min(100, interviewRate)),
    };
}

/**
 * Derive the status-breakdown chart series: one entry per occupied stage with
 * its non-negative count.
 */
export function getStatusBreakdown(jobs: Job[]): { stage: string; count: number }[] {
    const counts = jobs.reduce((acc, j) => {
        const stage = j.stage || "applied";
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
}

/**
 * Derive the applications-over-time chart series, bucketing applications into
 * the trailing `weeks` calendar weeks (oldest first) by their applied date.
 */
export function getApplicationsOverTime(
    jobs: Job[],
    weeks = 8
): { date: string; count: number }[] {
    const series: { date: string; count: number }[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
        const ref = new Date();
        ref.setDate(ref.getDate() - i * 7);
        const start = new Date(ref);
        start.setHours(0, 0, 0, 0);
        start.setDate(ref.getDate() - ref.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const count = jobs.filter((j) => {
            const d = new Date(j.dateApplied || j.createdAt);
            if (isNaN(d.getTime())) return false;
            return d >= start && d <= end;
        }).length;

        series.push({
            date: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            count,
        });
    }

    return series;
}

export type ActivityItem = {
    id: string;
    stage: string;
    title: string;
    company: string;
    timestamp: string;
};

/**
 * Derive the recent-activity feed: the most recently updated applications,
 * most recent first, capped at `limit` items (default 5).
 */
export function getRecentActivity(jobs: Job[], limit = 5): ActivityItem[] {
    return jobs
        .filter((j) => j.updatedAt)
        .sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, limit)
        .map((j) => ({
            id: j._id,
            stage: j.stage || "applied",
            title: j.title,
            company: j.company,
            timestamp:
                typeof j.updatedAt === "string"
                    ? j.updatedAt
                    : new Date(j.updatedAt).toISOString(),
        }));
}
