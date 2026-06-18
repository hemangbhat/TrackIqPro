// lib/plan-gate.property.test.ts
//
// Property-based tests (fast-check) for the presentation-layer Plan_Gate.
//
// Property 3: Gating consistency
//   For any plan and job count, the UI never enables a Pro-only action
//   (export, jobs beyond FREE_JOB_LIMIT) for a Free_User; the gate mirrors
//   server enforcement.
//
// These are kept distinct from the example-based suite in lib/plan-gate.test.ts:
// here we assert universal invariants across arbitrary plan strings (including
// random/unknown values) and arbitrary non-negative job counts.
//
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    canExport,
    canCreateJob,
    isAtJobLimit,
    gateExport,
    gateCreateJob,
    interpretServerRejection,
    isPlanRejection,
    EXPORT_UPGRADE_MESSAGE,
    JOB_LIMIT_UPGRADE_MESSAGE,
    type GatedAction,
} from "./plan-gate";
import { FREE_JOB_LIMIT, isPro } from "./plans";

// Arbitrary plan: the canonical "free"/"pro" values plus arbitrary/unknown
// strings (and null/undefined) so we cover the entire input space the gate
// might see from the server or client.
const planArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
    fc.constant("free"),
    fc.constant("pro"),
    fc.constant(null),
    fc.constant(undefined),
    fc.string()
);

// Arbitrary non-negative job count, including 0, the boundary, and large values.
const jobCountArb: fc.Arbitrary<number> = fc.nat();

describe("Property 3: gating consistency (export)", () => {
    it("never enables export for a non-pro plan; always enables it for Pro (Req 4.1, 4.3)", () => {
        fc.assert(
            fc.property(planArb, (plan) => {
                if (isPro(plan)) {
                    expect(canExport(plan)).toBe(true);
                } else {
                    expect(canExport(plan)).toBe(false);
                }
            })
        );
    });

    it("gateExport decision is internally consistent with canExport (Req 4.1, 4.3)", () => {
        fc.assert(
            fc.property(planArb, (plan) => {
                const allowed = canExport(plan);
                const d = gateExport(plan);

                expect(d.action).toBe("export");
                expect(d.allowed).toBe(allowed);

                if (allowed) {
                    expect(d.reason).toBe("ok");
                    expect(d.message).toBeNull();
                } else {
                    // A Free_User (or any non-pro plan) is gated with the
                    // export upgrade prompt — never silently allowed.
                    expect(d.reason).toBe("pro-required");
                    expect(d.message).toBe(EXPORT_UPGRADE_MESSAGE);
                }
            })
        );
    });
});

describe("Property 3: gating consistency (create-job)", () => {
    it("never enables job-create for a non-pro plan at/over FREE_JOB_LIMIT; always enables it for Pro (Req 4.2, 4.4)", () => {
        fc.assert(
            fc.property(planArb, jobCountArb, (plan, jobCount) => {
                const allowed = canCreateJob(plan, jobCount);

                if (isPro(plan)) {
                    // Pro_User is never limited by job count.
                    expect(allowed).toBe(true);
                } else if (jobCount >= FREE_JOB_LIMIT) {
                    // Free_User at/over the limit is never allowed.
                    expect(allowed).toBe(false);
                } else {
                    // Free_User below the limit is allowed.
                    expect(allowed).toBe(true);
                }
            })
        );
    });

    it("isAtJobLimit mirrors canCreateJob for non-pro plans and is always false for Pro (Req 4.2, 4.4)", () => {
        fc.assert(
            fc.property(planArb, jobCountArb, (plan, jobCount) => {
                const atLimit = isAtJobLimit(plan, jobCount);

                if (isPro(plan)) {
                    expect(atLimit).toBe(false);
                } else {
                    // For a non-pro plan, being at the limit is exactly the
                    // negation of being allowed to create a job.
                    expect(atLimit).toBe(!canCreateJob(plan, jobCount));
                    expect(atLimit).toBe(jobCount >= FREE_JOB_LIMIT);
                }
            })
        );
    });

    it("gateCreateJob decision is internally consistent with canCreateJob (Req 4.2, 4.4)", () => {
        fc.assert(
            fc.property(planArb, jobCountArb, (plan, jobCount) => {
                const allowed = canCreateJob(plan, jobCount);
                const d = gateCreateJob(plan, jobCount);

                expect(d.action).toBe("create-job");
                expect(d.allowed).toBe(allowed);

                if (allowed) {
                    expect(d.reason).toBe("ok");
                    expect(d.message).toBeNull();
                } else {
                    expect(d.reason).toBe("free-limit-reached");
                    expect(d.message).toBe(JOB_LIMIT_UPGRADE_MESSAGE);
                }
            })
        );
    });
});

describe("Property 3: gating mirrors server enforcement (Req 4.5)", () => {
    const actionArb: fc.Arbitrary<GatedAction> = fc.constantFrom(
        "export",
        "create-job"
    );

    it("interpreting a server rejection always yields a denied decision matching the action", () => {
        fc.assert(
            fc.property(actionArb, (action) => {
                const d = interpretServerRejection(action);

                // The server is authoritative: a rejection is always denied.
                expect(d.action).toBe(action);
                expect(d.allowed).toBe(false);
                expect(d.message).not.toBeNull();

                if (action === "export") {
                    expect(d.reason).toBe("pro-required");
                    expect(d.message).toBe(EXPORT_UPGRADE_MESSAGE);
                } else {
                    expect(d.reason).toBe("free-limit-reached");
                    expect(d.message).toBe(JOB_LIMIT_UPGRADE_MESSAGE);
                }
            })
        );
    });

    it("only 402/403 statuses are treated as plan rejections", () => {
        fc.assert(
            fc.property(fc.integer({ min: 100, max: 599 }), (status) => {
                const expected = status === 402 || status === 403;
                expect(isPlanRejection(status)).toBe(expected);
            })
        );
    });
});
