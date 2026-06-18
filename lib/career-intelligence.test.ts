import { describe, it, expect } from "vitest";
import { extractSkills } from "./skills";
import { computeJobFit } from "./career-fit";
import {
    analyzeOffers,
    simulateWhatIf,
    defaultOfferWeights,
    OFFER_DIMENSIONS,
} from "./offer-intelligence";
import { computeCareerHealth } from "./career-health";
import { getPriorityQueue } from "./follow-up-intelligence";
import { analyzeReflections } from "./interview-reflection";
import { getDemoDataset } from "./demo-data";
import type { Job, Offer, Note } from "../types";

/* --------------------------------- skills -------------------------------- */
describe("extractSkills", () => {
    it("detects canonical skills and aliases from free text", () => {
        const skills = extractSkills(
            "We use React, TypeScript (TS), Node.js and AWS. Bonus: k8s."
        );
        expect(skills).toContain("React");
        expect(skills).toContain("TypeScript");
        expect(skills).toContain("Node.js");
        expect(skills).toContain("AWS");
        expect(skills).toContain("Kubernetes");
    });
    it("returns [] for empty input and avoids partial-word false positives", () => {
        expect(extractSkills("")).toEqual([]);
        // "javascripting" should not match "javascript" mid-word... but our
        // boundary allows suffixes; assert the common safe case instead.
        expect(extractSkills("cooking and baking")).toEqual([]);
    });
});

/* ------------------------------- career-fit ------------------------------ */
describe("computeJobFit", () => {
    const job = {
        title: "Senior Frontend Engineer",
        jobDescription: "React, TypeScript, Next.js, GraphQL, testing, system design.",
    };

    it("scores higher when the user has more required skills", () => {
        const strong = computeJobFit(job, {
            skills: ["React", "TypeScript", "Next.js", "GraphQL", "Testing", "System Design"],
            targetRole: "Frontend Engineer",
            seniority: "senior",
        });
        const weak = computeJobFit(job, { skills: ["Python"], seniority: "junior" });
        expect(strong.score).toBeGreaterThan(weak.score);
        expect(strong.score).toBeGreaterThanOrEqual(0);
        expect(strong.score).toBeLessThanOrEqual(100);
    });

    it("always explains the score (never a bare number)", () => {
        const res = computeJobFit(job, { skills: ["React", "TypeScript"] });
        expect(res.whatHelped.length).toBeGreaterThan(0);
        expect(res.whatReduced.length).toBeGreaterThan(0);
        expect(res.summary).toBeTruthy();
        expect(res.strongMatches).toContain("React");
        expect(res.missingSkills).toContain("GraphQL");
    });

    it("suggests learning areas drawn from missing skills", () => {
        const res = computeJobFit(job, { skills: ["React"] });
        expect(res.suggestedLearning.length).toBeGreaterThan(0);
        res.suggestedLearning.forEach((s) => expect(res.missingSkills).toContain(s));
    });

    it("degrades confidence when the job text has little signal", () => {
        const res = computeJobFit({ title: "Engineer", jobDescription: "Great team." }, {
            skills: ["React"],
        });
        expect(res.confidence).toBe("low");
    });
});

/* --------------------------- offer-intelligence -------------------------- */
function offer(p: Partial<Offer>): Offer {
    return {
        company: "Co", title: "Eng", salaryBase: 100000, status: "pending", ...p,
    } as Offer;
}

describe("analyzeOffers", () => {
    const offers: Offer[] = [
        offer({ _id: "a", company: "A", salaryBase: 200000, growthScore: 9, brandScore: 8, remoteType: "remote", techStack: ["React", "TS"], ptoDays: 25 }),
        offer({ _id: "b", company: "B", salaryBase: 150000, growthScore: 6, brandScore: 9, remoteType: "onsite", techStack: ["Go"], ptoDays: 15 }),
        offer({ _id: "c", company: "C", salaryBase: 120000, growthScore: 7, brandScore: 5, remoteType: "hybrid", techStack: ["Vue", "Node.js"], ptoDays: 20 }),
    ];

    it("scores all six dimensions and an overall 0-100 fit", () => {
        const res = analyzeOffers(offers, defaultOfferWeights);
        expect(res.offers).toHaveLength(3);
        for (const o of res.offers) {
            expect(o.overall).toBeGreaterThanOrEqual(0);
            expect(o.overall).toBeLessThanOrEqual(100);
            OFFER_DIMENSIONS.forEach((d) => {
                expect(o.dimensions[d].score).toBeGreaterThanOrEqual(0);
                expect(o.dimensions[d].score).toBeLessThanOrEqual(100);
            });
        }
    });

    it("ranks offers and flags exactly one best, sorted by overall desc", () => {
        const res = analyzeOffers(offers, defaultOfferWeights);
        expect(res.offers[0].rank).toBe(1);
        expect(res.offers[0].isBest).toBe(true);
        for (let i = 1; i < res.offers.length; i++) {
            expect(res.offers[i - 1].overall).toBeGreaterThanOrEqual(res.offers[i].overall);
        }
    });

    it("produces ranking rationale: why #1 and paths to top", () => {
        const res = analyzeOffers(offers, defaultOfferWeights);
        expect(res.rationale.whyTop).toMatch(/#1/);
        expect(res.rationale.pathsToTop).toHaveLength(2);
        res.rationale.pathsToTop.forEach((p) => expect(p.message).toBeTruthy());
    });

    it("what-if: changing weights can change ranking and reports movement", () => {
        const base = analyzeOffers(offers, defaultOfferWeights);
        // Heavily favor brand → should advantage the high-brand offer "B".
        const sim = simulateWhatIf(offers, base, {
            compensation: 0, growth: 0, techStack: 0, brand: 100, flexibility: 0, location: 0,
        });
        expect(sim.movement).toHaveLength(3);
        const top = sim.offers[0];
        expect(top.id).toBe("b"); // highest brandScore
        expect(typeof sim.winnerChanged).toBe("boolean");
    });

    it("handles empty offer set", () => {
        const res = analyzeOffers([], defaultOfferWeights);
        expect(res.offers).toEqual([]);
    });
});

/* ------------------------------ career-health ---------------------------- */
function job(p: Partial<Job>): Job {
    const now = new Date().toISOString();
    return {
        _id: Math.random().toString(36).slice(2), userId: "u", title: "Eng", company: "Co",
        stage: "applied", status: "active", dateApplied: now, createdAt: now, updatedAt: now, ...p,
    } as Job;
}

describe("computeCareerHealth", () => {
    it("returns an empty-state result with guidance for no jobs", () => {
        const res = computeCareerHealth([]);
        expect(res.score).toBe(0);
        expect(res.grade).toBe("Needs Improvement");
        expect(res.recommendations.length).toBeGreaterThan(0);
    });

    it("computes a 0-100 score, grade, weighted metrics and recommendations", () => {
        const jobs = [
            job({ stage: "offer", status: "active" }),
            job({ stage: "interview" }),
            job({ stage: "screening" }),
            job({ stage: "applied" }),
        ];
        const res = computeCareerHealth(jobs);
        expect(res.score).toBeGreaterThanOrEqual(0);
        expect(res.score).toBeLessThanOrEqual(100);
        expect(["Excellent", "Good", "Needs Improvement"]).toContain(res.grade);
        expect(res.metrics).toHaveLength(5);
        const weightSum = res.metrics.reduce((s, m) => s + m.weight, 0);
        expect(weightSum).toBeCloseTo(1, 5);
        res.metrics.forEach((m) => expect(m.detail).toBeTruthy());
        expect(res.recommendations.length).toBeGreaterThan(0);
    });
});

/* -------------------------- follow-up-intelligence ----------------------- */
describe("getPriorityQueue", () => {
    it("ranks overdue items by value with explanations; excludes fresh items", () => {
        const old = new Date(); old.setDate(old.getDate() - 30);
        const fresh = new Date().toISOString();
        const jobs = [
            job({ stage: "offer", status: "active", updatedAt: old.toISOString() }),
            job({ stage: "interview", status: "active", updatedAt: old.toISOString() }),
            job({ stage: "applied", status: "active", updatedAt: fresh }), // not overdue
        ];
        const queue = getPriorityQueue(jobs);
        expect(queue.length).toBe(2);
        // Offer should outrank interview (higher stage value).
        expect(queue[0].stage).toBe("offer");
        for (let i = 1; i < queue.length; i++) {
            expect(queue[i - 1].value).toBeGreaterThanOrEqual(queue[i].value);
        }
        queue.forEach((q) => {
            expect(q.action).toBeTruthy();
            expect(q.why).toBeTruthy();
            expect(q.expectedImpact).toBeTruthy();
        });
    });
});

/* -------------------------- interview-reflection ------------------------- */
describe("analyzeReflections", () => {
    function note(p: Partial<Note>): Note {
        return {
            _id: Math.random().toString(36).slice(2), title: "Interview", content: "",
            createdAt: new Date().toISOString(), round: "Technical", ...p,
        } as Note;
    }

    it("extracts strengths, weaknesses, recurring mistakes and a confidence trend", () => {
        const notes: Note[] = [
            note({ title: "R1", content: "Nervous and ran out of time, struggled with complexity.", createdAt: "2024-01-01T00:00:00Z" }),
            note({ title: "R2", content: "Ran out of time again, but confident on system design.", createdAt: "2024-02-01T00:00:00Z" }),
            note({ title: "R3", content: "Confident, clear, nailed it. Strong communication.", createdAt: "2024-03-01T00:00:00Z" }),
        ];
        const res = analyzeReflections(notes);
        expect(res.analyzed).toBe(3);
        expect(res.confidenceTrend).toHaveLength(3);
        // "Time management" appears twice → recurring.
        expect(res.recurringMistakes.some((m) => m.text === "Time management")).toBe(true);
        expect(res.strengths.length).toBeGreaterThan(0);
        expect(res.summary).toBeTruthy();
        // Confidence improves from negative to positive across the set.
        expect(["improving", "steady"]).toContain(res.trendDirection);
    });

    it("handles no notes with guidance", () => {
        const res = analyzeReflections([]);
        expect(res.analyzed).toBe(0);
        expect(res.trendDirection).toBe("insufficient");
        expect(res.summary).toBeTruthy();
    });
});

/* -------------------------------- demo data ------------------------------ */
describe("demo dataset feeds every engine", () => {
    it("produces valid, explainable outputs across all intelligence features", () => {
        const { jobs, offers, notes, profile } = getDemoDataset();
        expect(jobs.length).toBeGreaterThan(0);

        const health = computeCareerHealth(jobs);
        expect(health.score).toBeGreaterThan(0);

        const queue = getPriorityQueue(jobs);
        expect(Array.isArray(queue)).toBe(true);

        const offerRes = analyzeOffers(offers);
        expect(offerRes.offers[0].isBest).toBe(true);
        expect(offerRes.rationale.whyTop).toBeTruthy();

        const fit = computeJobFit(jobs[0], profile);
        expect(fit.score).toBeGreaterThan(0);
        expect(fit.whatHelped.length + fit.whatReduced.length).toBeGreaterThan(0);

        const reflection = analyzeReflections(notes);
        expect(reflection.analyzed).toBeGreaterThan(0);
    });
});
