// lib/career-fit.ts
// Explainable Job Fit scoring. Given a job (description + title) and the user's
// career profile (skills, target role, seniority), compute a transparent 0-100
// fit score with strong matches, missing skills, suggested learning areas, and
// an explicit breakdown of "what helped" and "what reduced" the score.
//
// No black-box output: every number is accompanied by the reasoning that
// produced it.

import { extractSkills } from "./skills";

export type Seniority = "intern" | "junior" | "mid" | "senior" | "staff" | "lead";

export interface CareerProfile {
    /** Canonical or free-text skills the user has. */
    skills: string[];
    /** The role the user is targeting, e.g. "Frontend Engineer". */
    targetRole?: string;
    /** The user's seniority level. */
    seniority?: Seniority;
}

export interface FitReason {
    label: string;
    /** Signed contribution to the score, in points. */
    impact: number;
}

export interface JobFitResult {
    /** 0-100 overall fit score. */
    score: number;
    /** Skills required by the job that the user already has. */
    strongMatches: string[];
    /** Skills required by the job that the user is missing. */
    missingSkills: string[];
    /** Prioritized learning areas (subset of missingSkills, most valuable first). */
    suggestedLearning: string[];
    /** Skills the user has that the job also values (extra signal). */
    bonusSkills: string[];
    /** Positive factors that raised the score. */
    whatHelped: FitReason[];
    /** Negative factors that lowered the score. */
    whatReduced: FitReason[];
    /** One-line plain-language summary. */
    summary: string;
    /** Confidence in the score given how much signal the job text provided. */
    confidence: "high" | "medium" | "low";
}

const SENIORITY_RANK: Record<Seniority, number> = {
    intern: 0,
    junior: 1,
    mid: 2,
    senior: 3,
    staff: 4,
    lead: 4,
};

/** Detect the seniority a job title implies, if any. */
function inferTitleSeniority(title: string): Seniority | null {
    const t = title.toLowerCase();
    if (/\b(intern|internship)\b/.test(t)) return "intern";
    if (/\b(jr|junior|entry|associate|grad|new grad)\b/.test(t)) return "junior";
    if (/\b(staff|principal)\b/.test(t)) return "staff";
    if (/\b(lead|head|manager|director)\b/.test(t)) return "lead";
    if (/\b(sr|senior)\b/.test(t)) return "senior";
    return null;
}

function roleAlignment(targetRole: string | undefined, jobTitle: string): number {
    if (!targetRole) return 0;
    const target = targetRole.toLowerCase().split(/\s+/).filter(Boolean);
    const title = jobTitle.toLowerCase();
    if (target.length === 0) return 0;
    const overlap = target.filter((w) => w.length > 2 && title.includes(w)).length;
    return overlap / target.length; // 0..1
}

function round(n: number): number {
    return Math.round(n);
}

/**
 * Compute an explainable job-fit score.
 *
 * Scoring model (transparent):
 *   - Skill coverage (up to 70 pts): share of the job's detected skills the
 *     user already has. This is the dominant signal.
 *   - Role alignment (up to 20 pts): word overlap between the user's target
 *     role and the job title.
 *   - Seniority alignment (up to 10 pts, can subtract): penalize large gaps
 *     between the user's level and the level the title implies.
 *   - Bonus skills (up to +5 pts): extra relevant skills the user brings.
 *
 * When the job text yields too few skills to judge, confidence is downgraded
 * and the score leans on role/seniority signals.
 */
export function computeJobFit(
    job: { title?: string; jobDescription?: string; notes?: string },
    profile: CareerProfile
): JobFitResult {
    const title = job.title ?? "";
    const text = [job.jobDescription, job.notes, title].filter(Boolean).join("\n");

    const jobSkills = extractSkills(text);
    const userSkills = new Set(
        profile.skills.flatMap((s) => extractSkills(s).concat(s.trim()))
            .map((s) => s.toLowerCase())
    );

    const hasSkill = (canonical: string) => userSkills.has(canonical.toLowerCase());

    const strongMatches = jobSkills.filter(hasSkill);
    const missingSkills = jobSkills.filter((s) => !hasSkill(s));

    // User skills (canonical) that aren't explicitly required but are real tech.
    const userCanonical = new Set(profile.skills.flatMap((s) => extractSkills(s)));
    const bonusSkills = Array.from(userCanonical).filter((s) => !jobSkills.includes(s));

    const whatHelped: FitReason[] = [];
    const whatReduced: FitReason[] = [];

    // 1) Skill coverage (0..70)
    let coveragePts = 0;
    if (jobSkills.length > 0) {
        const coverage = strongMatches.length / jobSkills.length;
        coveragePts = coverage * 70;
        if (strongMatches.length > 0) {
            whatHelped.push({
                label: `Matches ${strongMatches.length} of ${jobSkills.length} required skills (${strongMatches
                    .slice(0, 5)
                    .join(", ")})`,
                impact: round(coveragePts),
            });
        }
        if (missingSkills.length > 0) {
            const missPts = (missingSkills.length / jobSkills.length) * 70;
            whatReduced.push({
                label: `Missing ${missingSkills.length} required skill${
                    missingSkills.length === 1 ? "" : "s"
                } (${missingSkills.slice(0, 5).join(", ")})`,
                impact: -round(missPts),
            });
        }
    } else {
        // No detectable skills — give a neutral baseline so the score isn't 0.
        coveragePts = 35;
        whatReduced.push({
            label: "Job description lists few recognizable skills — score is less certain",
            impact: 0,
        });
    }

    // 2) Role alignment (0..20)
    const align = roleAlignment(profile.targetRole, title);
    const rolePts = align * 20;
    if (profile.targetRole) {
        if (align >= 0.5) {
            whatHelped.push({
                label: `Title aligns with your target role "${profile.targetRole}"`,
                impact: round(rolePts),
            });
        } else if (align === 0) {
            whatReduced.push({
                label: `Title doesn't match your target role "${profile.targetRole}"`,
                impact: 0,
            });
        }
    }

    // 3) Seniority alignment (−10..+10)
    let seniorityPts = 5; // neutral default
    const titleSen = inferTitleSeniority(title);
    if (profile.seniority && titleSen) {
        const gap = Math.abs(SENIORITY_RANK[profile.seniority] - SENIORITY_RANK[titleSen]);
        if (gap === 0) {
            seniorityPts = 10;
            whatHelped.push({ label: `Seniority matches the ${titleSen} level`, impact: 10 });
        } else if (gap === 1) {
            seniorityPts = 6;
            whatHelped.push({ label: `Seniority is close to the ${titleSen} level`, impact: 6 });
        } else {
            seniorityPts = 0;
            whatReduced.push({
                label: `Seniority gap: role targets ${titleSen}, you're ${profile.seniority}`,
                impact: -5,
            });
        }
    }

    // 4) Bonus skills (0..5)
    let bonusPts = 0;
    if (bonusSkills.length > 0) {
        bonusPts = Math.min(5, bonusSkills.length);
        whatHelped.push({
            label: `Brings ${bonusSkills.length} extra relevant skill${
                bonusSkills.length === 1 ? "" : "s"
            }`,
            impact: round(bonusPts),
        });
    }

    const raw = coveragePts + rolePts + seniorityPts + bonusPts;
    const score = Math.max(0, Math.min(100, round(raw)));

    // Suggested learning: the missing skills, prioritized (practice/system-design
    // and languages first as higher leverage), capped at 4.
    const suggestedLearning = [...missingSkills]
        .sort((a, b) => priorityOfSkill(b) - priorityOfSkill(a))
        .slice(0, 4);

    const confidence: JobFitResult["confidence"] =
        jobSkills.length >= 5 ? "high" : jobSkills.length >= 2 ? "medium" : "low";

    const summary = buildSummary(score, strongMatches, missingSkills);

    // Sort reasons by absolute impact, strongest first.
    whatHelped.sort((a, b) => b.impact - a.impact);
    whatReduced.sort((a, b) => a.impact - b.impact);

    return {
        score,
        strongMatches,
        missingSkills,
        suggestedLearning,
        bonusSkills,
        whatHelped,
        whatReduced,
        summary,
        confidence,
    };
}

function priorityOfSkill(name: string): number {
    // Higher = learn first. Foundational practices and languages rank highest.
    const high = ["System Design", "Testing", "TypeScript", "JavaScript", "Python", "SQL"];
    return high.includes(name) ? 2 : 1;
}

function buildSummary(score: number, strong: string[], missing: string[]): string {
    if (score >= 80) {
        return `Strong fit — you cover most requirements${
            missing.length ? `, with ${missing.length} gap${missing.length === 1 ? "" : "s"} to close` : ""
        }.`;
    }
    if (score >= 60) {
        return `Solid fit — ${strong.length} matching skill${
            strong.length === 1 ? "" : "s"
        }; closing ${missing.slice(0, 2).join(" & ") || "a few gaps"} would push this higher.`;
    }
    if (score >= 40) {
        return `Moderate fit — some overlap, but several key skills are missing.`;
    }
    return `Stretch role — limited overlap with your current skills. Use the learning areas to build toward it.`;
}
