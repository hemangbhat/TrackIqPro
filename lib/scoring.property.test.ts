// lib/scoring.property.test.ts
// Property-based tests for scoring fidelity (task 14.2 — Property 4).
//
// Property 4: Scoring fidelity
//   For any offer set and weights, the highlighted best offer equals
//   argmax(scoreOffers(offers, weights).score), and the UI performs no
//   independent scoring math.
//
// OfferMatrix derives its highlight exactly as `rows.find(o => o.isBest)`
// where `rows = scoreOffers(offers, weights)` — it never recomputes scores.
// These properties pin that contract on the Scoring_Engine output: the
// `isBest` flag the UI reads is precisely the engine's argmax-by-score, the
// engine neither adds nor removes offers, and scores stay within 0–100.
//
// **Validates: Requirements 10.2, 10.3**
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Offer } from "../types";
import { scoreOffers, Weights, ScoredOffer } from "./scoring";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// A small company/title pool keeps the records readable in counterexamples.
const nameArb = fc.constantFrom(
    "Acme",
    "Globex",
    "Initech",
    "Umbrella",
    "Hooli",
    "Stark",
    ""
);

// Monetary fields are non-negative integers; qualitative scores are 0–10.
const moneyArb = (max: number) => fc.integer({ min: 0, max });
const scoreArb = fc.integer({ min: 0, max: 10 });

function offerArb(): fc.Arbitrary<Offer> {
    return fc.record({
        company: nameArb,
        title: nameArb,
        salaryBase: moneyArb(1_000_000),
        bonus: fc.option(moneyArb(300_000), { nil: undefined }),
        equity: fc.option(moneyArb(2_000_000), { nil: undefined }),
        signingBonus: fc.option(moneyArb(150_000), { nil: undefined }),
        growthScore: fc.option(scoreArb, { nil: undefined }),
        brandScore: fc.option(scoreArb, { nil: undefined }),
        status: fc.constantFrom(
            "pending",
            "accepted",
            "rejected"
        ) as fc.Arbitrary<Offer["status"]>,
    }) as fc.Arbitrary<Offer>;
}

// Unique _id values so we can reason about offers via identity/sets.
function offersArb(): fc.Arbitrary<Offer[]> {
    return fc
        .array(offerArb(), { minLength: 0, maxLength: 25 })
        .map((offers) => offers.map((o, i) => ({ ...o, _id: `offer-${i}` })));
}

// Weights live on the slider's 0–100 inclusive scale (Req 10.4). Generating
// the full range — including the all-zero corner — exercises normalizeWeights.
const weightsArb: fc.Arbitrary<Weights> = fc.record({
    salary: fc.integer({ min: 0, max: 100 }),
    equity: fc.integer({ min: 0, max: 100 }),
    growth: fc.integer({ min: 0, max: 100 }),
    brand: fc.integer({ min: 0, max: 100 }),
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("scoring property tests (Property 4: scoring fidelity)", () => {
    // The best-offer the UI highlights (find(o => o.isBest)) equals the
    // engine's argmax by score — and is exactly the engine's own output, never
    // a value the UI recomputes.
    // **Validates: Requirements 10.2, 10.3**
    it("the isBest-flagged offer is the engine's argmax by score", () => {
        fc.assert(
            fc.property(offersArb(), weightsArb, (offers, weights) => {
                const rows = scoreOffers(offers, weights);

                if (offers.length === 0) {
                    expect(rows).toHaveLength(0);
                    return;
                }

                // This mirrors OfferMatrix exactly: it reads the flag, it does
                // not score anything itself.
                const best = rows.find((o) => o.isBest);
                expect(best).toBeDefined();

                // argmax computed over the engine's own stored scores (no
                // independent scoring math — we only compare the numbers the
                // engine emitted).
                const topScore = Math.max(...rows.map((r) => r.score));
                expect(best!.score).toBe(topScore);

                // Engine returns rows sorted descending by score, so the
                // highlighted offer is the head row.
                expect(best).toBe(rows[0]);
            })
        );
    });

    // The isBest flag marks exactly the maximal-scoring offers and nothing
    // else: every flagged offer ties the top score, and every offer at the top
    // score is flagged.
    // **Validates: Requirements 10.2**
    it("isBest is set on exactly the offers whose score equals the max", () => {
        fc.assert(
            fc.property(offersArb(), weightsArb, (offers, weights) => {
                const rows = scoreOffers(offers, weights);
                if (rows.length === 0) return;

                const topScore = Math.max(...rows.map((r) => r.score));
                for (const row of rows) {
                    expect(row.isBest).toBe(row.score === topScore);
                }
                // At least one offer is always highlighted.
                expect(rows.some((r) => r.isBest)).toBe(true);
            })
        );
    });

    // The engine is a pure ranking: it neither adds nor removes offers, and the
    // output is a permutation of the input by identity.
    // **Validates: Requirements 10.2**
    it("preserves the offer set (no offers added or removed)", () => {
        fc.assert(
            fc.property(offersArb(), weightsArb, (offers, weights) => {
                const rows = scoreOffers(offers, weights);
                expect(rows).toHaveLength(offers.length);
                expect(new Set(rows.map((r) => r._id))).toEqual(
                    new Set(offers.map((o) => o._id))
                );
            })
        );
    });

    // Every emitted score is a finite value within the 0–100 fit-score bounds,
    // and rows are ordered by descending score.
    // **Validates: Requirements 10.2, 10.3**
    it("scores are within 0–100 and ordered descending", () => {
        fc.assert(
            fc.property(offersArb(), weightsArb, (offers, weights) => {
                const rows: ScoredOffer<Offer>[] = scoreOffers(offers, weights);
                for (const row of rows) {
                    expect(Number.isFinite(row.score)).toBe(true);
                    expect(row.score).toBeGreaterThanOrEqual(0);
                    expect(row.score).toBeLessThanOrEqual(100);
                }
                for (let i = 1; i < rows.length; i++) {
                    expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
                }
            })
        );
    });

    // Determinism (Req 10.3): re-deriving with the same offers + weights yields
    // identical scores and the same highlight — adjusting weights re-derives
    // scores deterministically.
    // **Validates: Requirements 10.3**
    it("is deterministic for the same offers and weights", () => {
        fc.assert(
            fc.property(offersArb(), weightsArb, (offers, weights) => {
                const a = scoreOffers(offers, weights);
                const b = scoreOffers(offers, weights);
                expect(b.map((r) => r.score)).toEqual(a.map((r) => r.score));
                expect(b.map((r) => r._id)).toEqual(a.map((r) => r._id));
                expect(b.map((r) => r.isBest)).toEqual(a.map((r) => r.isBest));
            })
        );
    });
});
