import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getKpis,
  getStatusBreakdown,
  getApplicationsOverTime,
  getRecentActivity,
  getFollowUpSuggestions,
} from "./insights";
import { Job } from "../types";

/**
 * Task 8.3 — KPI derivation bounds and Insights_Engine list caps.
 *
 * The dashboard derives every value it shows from the Insights_Engine pure
 * functions in `lib/insights` and performs no independent computation
 * (Requirements 6.1, 6.3). These tests pin the engine's contract directly:
 *  - getKpis: total/offers/active are non-negative integers and interviewRate
 *    is an integer percentage in the inclusive range 0–100 (Req 6.1).
 *  - getRecentActivity / getFollowUpSuggestions: at most five items, with the
 *    most urgent follow-up ordered first (Req 6.3).
 */

const STAGES: Job["stage"][] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "accepted",
  "withdrawn",
];

let seq = 0;
function makeJob(overrides: Partial<Job> = {}): Job {
  const now = new Date().toISOString();
  return {
    _id: `job-${seq++}`,
    userId: "user-1",
    title: "Software Engineer",
    company: "Acme",
    stage: "applied",
    status: "active",
    dateApplied: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  Example-based unit tests                                                   */
/* -------------------------------------------------------------------------- */

describe("getKpis — example bounds (Req 6.1)", () => {
  it("returns all-zero KPIs for an empty jobs array", () => {
    const kpis = getKpis([]);
    expect(kpis).toEqual({ total: 0, active: 0, offers: 0, interviewRate: 0 });
  });

  it("derives counts and a 0–100 interview rate from a known set", () => {
    // 5 jobs: applied, screening, interview, offer (active), accepted (closed).
    const jobs: Job[] = [
      makeJob({ stage: "applied", status: "active" }),
      makeJob({ stage: "screening", status: "active" }),
      makeJob({ stage: "interview", status: "active" }),
      makeJob({ stage: "offer", status: "active" }),
      makeJob({ stage: "accepted", status: "closed" }),
    ];

    const kpis = getKpis(jobs);

    expect(kpis.total).toBe(5);
    // offer + accepted = 2
    expect(kpis.offers).toBe(2);
    // 4 active (everything except the closed accepted job)
    expect(kpis.active).toBe(4);
    // interview + offer + accepted = 3 of 5 -> 60%
    expect(kpis.interviewRate).toBe(60);
  });

  it("clamps the interview rate to 100 when every job has reached interview", () => {
    const jobs = [
      makeJob({ stage: "interview" }),
      makeJob({ stage: "offer" }),
      makeJob({ stage: "accepted" }),
    ];
    expect(getKpis(jobs).interviewRate).toBe(100);
  });
});

describe("getRecentActivity / getFollowUpSuggestions — caps (Req 6.3)", () => {
  it("caps recent activity at five most-recent items", () => {
    const jobs = Array.from({ length: 9 }, (_, i) =>
      makeJob({
        title: `Job ${i}`,
        updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
      })
    );
    const recent = getRecentActivity(jobs, 5);
    expect(recent).toHaveLength(5);
    // Most recent first: the freshest job (i=0) leads.
    expect(recent[0].title).toBe("Job 0");
  });

  it("caps follow-up suggestions at five with the most urgent first", () => {
    // Active 'applied' jobs that have gone quiet well past the 10-day threshold.
    const jobs = Array.from({ length: 8 }, (_, i) =>
      makeJob({
        stage: "applied",
        status: "active",
        updatedAt: new Date(Date.now() - (20 + i * 5) * 86400000).toISOString(),
      })
    );
    const suggestions = getFollowUpSuggestions(jobs);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    for (let i = 0; i < suggestions.length - 1; i++) {
      expect(suggestions[i].daysStale).toBeGreaterThanOrEqual(
        suggestions[i + 1].daysStale
      );
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Property-based tests (fast-check)                                          */
/* -------------------------------------------------------------------------- */

const daysAgoArb = fc
  .integer({ min: 0, max: 120 })
  .map((d) => new Date(Date.now() - d * 86400000).toISOString());

const jobArb: fc.Arbitrary<Job> = fc.record({
  _id: fc.string({ minLength: 1 }),
  userId: fc.constant("user-1"),
  title: fc.string(),
  company: fc.string(),
  stage: fc.constantFrom(...STAGES),
  status: fc.constantFrom<Job["status"]>("active", "closed"),
  dateApplied: daysAgoArb,
  createdAt: daysAgoArb,
  updatedAt: daysAgoArb,
}) as fc.Arbitrary<Job>;

describe("getKpis — property: value bounds for any jobs array (Req 6.1)", () => {
  it("total/offers/active are non-negative integers and interviewRate is 0–100", () => {
    fc.assert(
      fc.property(fc.array(jobArb, { maxLength: 60 }), (jobs) => {
        const k = getKpis(jobs);

        // total equals the input length and is a non-negative integer.
        expect(k.total).toBe(jobs.length);

        for (const v of [k.total, k.offers, k.active]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(k.total);
        }

        expect(Number.isInteger(k.interviewRate)).toBe(true);
        expect(k.interviewRate).toBeGreaterThanOrEqual(0);
        expect(k.interviewRate).toBeLessThanOrEqual(100);
      })
    );
  });
});

describe("Insights lists — property: bounded size and ordering (Req 6.3)", () => {
  it("recent activity and follow-ups never exceed five items; follow-ups are most-urgent-first", () => {
    fc.assert(
      fc.property(fc.array(jobArb, { maxLength: 60 }), (jobs) => {
        expect(getRecentActivity(jobs, 5).length).toBeLessThanOrEqual(5);

        const suggestions = getFollowUpSuggestions(jobs);
        expect(suggestions.length).toBeLessThanOrEqual(5);
        for (let i = 0; i < suggestions.length - 1; i++) {
          expect(suggestions[i].daysStale).toBeGreaterThanOrEqual(
            suggestions[i + 1].daysStale
          );
        }
      })
    );
  });

  it("status breakdown and timeline counts are non-negative and sum to the input size", () => {
    fc.assert(
      fc.property(fc.array(jobArb, { maxLength: 60 }), (jobs) => {
        const breakdown = getStatusBreakdown(jobs);
        const total = breakdown.reduce((s, b) => {
          expect(b.count).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(b.count)).toBe(true);
          return s + b.count;
        }, 0);
        // Every job lands in exactly one stage bucket.
        expect(total).toBe(jobs.length);

        const timeline = getApplicationsOverTime(jobs);
        for (const point of timeline) {
          expect(point.count).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(point.count)).toBe(true);
        }
      })
    );
  });
});
