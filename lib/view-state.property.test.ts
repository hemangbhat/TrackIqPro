// lib/view-state.property.test.ts
//
// Property 2: State coverage
//
// For any combination of loading/error/data inputs, the view-state resolver
// yields EXACTLY ONE of the four mutually-exclusive View_States
// {loading, empty, error, ready}, respecting the documented precedence
// loading > error > empty > ready. Additionally, for any plan + jobCount, the
// Plan_Gate decisions resolve to EXACTLY ONE of {gated, allowed} and do so
// consistently across the boolean predicates and the GateDecision objects.
//
// **Validates: Requirements 3.6, 4.1, 4.2, 4.3, 4.4**

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { resolveViewState, type ViewState } from "./view-state";
import {
    canExport,
    canCreateJob,
    gateExport,
    gateCreateJob,
} from "./plan-gate";
import { FREE_JOB_LIMIT } from "./plans";

const ALL_STATES: ViewState[] = ["loading", "empty", "error", "ready"];

describe("Property 2: State coverage (view-state resolver)", () => {
    // Arbitrary { loading: boolean, error: string|null, data: array|null }.
    const inputArb = fc.record({
        loading: fc.boolean(),
        error: fc.option(fc.string(), { nil: null }),
        data: fc.option(fc.array(fc.anything()), { nil: null }),
    });

    it("yields exactly one of the four view states for any input", () => {
        fc.assert(
            fc.property(inputArb, (input) => {
                const state = resolveViewState(input);
                // The result is a member of the four-state set...
                expect(ALL_STATES).toContain(state);
                // ...and exactly one state matches (mutual exclusivity).
                const matches = ALL_STATES.filter((s) => s === state);
                expect(matches).toHaveLength(1);
            })
        );
    });

    it("respects the precedence loading > error > empty > ready", () => {
        fc.assert(
            fc.property(inputArb, (input) => {
                const state = resolveViewState(input);
                const hasError = input.error != null && input.error !== "";
                const items = Array.isArray(input.data) ? input.data : [];

                if (input.loading) {
                    expect(state).toBe("loading");
                } else if (hasError) {
                    expect(state).toBe("error");
                } else if (items.length === 0) {
                    expect(state).toBe("empty");
                } else {
                    expect(state).toBe("ready");
                }
            })
        );
    });

    it("is deterministic — the same input always yields the same state", () => {
        fc.assert(
            fc.property(inputArb, (input) => {
                expect(resolveViewState(input)).toBe(resolveViewState(input));
            })
        );
    });
});

describe("Property 2: State coverage (gated views resolve to exactly one of {gated, allowed})", () => {
    const planArb = fc.constantFrom<"free" | "pro">("free", "pro");
    // Cover values straddling the free limit boundary, plus arbitrary counts.
    const jobCountArb = fc.oneof(
        fc.integer({ min: 0, max: FREE_JOB_LIMIT * 2 }),
        fc.nat()
    );

    it("export gating resolves to exactly one of {gated, allowed} consistently", () => {
        fc.assert(
            fc.property(planArb, (plan) => {
                const allowed = canExport(plan);
                const decision = gateExport(plan);

                // Boolean predicate and GateDecision agree (exactly one outcome).
                expect(decision.allowed).toBe(allowed);

                if (allowed) {
                    // "allowed": no upgrade prompt, reason ok.
                    expect(decision.reason).toBe("ok");
                    expect(decision.message).toBeNull();
                    // Export is a Pro-only action (Req 4.3 / 4.1).
                    expect(plan).toBe("pro");
                } else {
                    // "gated": upgrade prompt present, reason pro-required.
                    expect(decision.reason).toBe("pro-required");
                    expect(decision.message).not.toBeNull();
                    // Free_User is always gated from export (Req 4.1).
                    expect(plan).toBe("free");
                }
            })
        );
    });

    it("create-job gating resolves to exactly one of {gated, allowed} consistently", () => {
        fc.assert(
            fc.property(planArb, jobCountArb, (plan, jobCount) => {
                const allowed = canCreateJob(plan, jobCount);
                const decision = gateCreateJob(plan, jobCount);

                // Boolean predicate and GateDecision agree (exactly one outcome).
                expect(decision.allowed).toBe(allowed);

                if (allowed) {
                    expect(decision.reason).toBe("ok");
                    expect(decision.message).toBeNull();
                } else {
                    expect(decision.reason).toBe("free-limit-reached");
                    expect(decision.message).not.toBeNull();
                }

                // Cross-check against the authoritative rule:
                // Pro_User is never limited (Req 4.4); Free_User allowed only
                // while strictly below FREE_JOB_LIMIT (Req 4.2).
                if (plan === "pro") {
                    expect(allowed).toBe(true);
                } else {
                    expect(allowed).toBe(jobCount < FREE_JOB_LIMIT);
                }
            })
        );
    });

    it("a gated decision and an allowed decision are never both true for the same action/inputs", () => {
        fc.assert(
            fc.property(planArb, jobCountArb, (plan, jobCount) => {
                const exportDecision = gateExport(plan);
                // allowed === true XOR message present (gated).
                expect(exportDecision.allowed).toBe(exportDecision.message === null);

                const createDecision = gateCreateJob(plan, jobCount);
                expect(createDecision.allowed).toBe(createDecision.message === null);
            })
        );
    });
});
