// lib/offer-intelligence.ts
// Offer Intelligence Engine — evolves the 4-factor scorer into a 6-dimension,
// fully explainable comparison with ranking rationale and a what-if simulator.
//
// Dimensions: Compensation, Growth, Tech Stack, Brand, Flexibility, Location.
// All dimension scores are normalized 0-100 across the current offer set, then
// combined with user weights into an Overall Fit Score. Every ranking comes
// with "why #1" and "what would change the ranking" — never a bare number.

import { Offer } from "../types";

export type OfferDimension =
    | "compensation"
    | "growth"
    | "techStack"
    | "brand"
    | "flexibility"
    | "location";

export const OFFER_DIMENSIONS: OfferDimension[] = [
    "compensation",
    "growth",
    "techStack",
    "brand",
    "flexibility",
    "location",
];

export const DIMENSION_LABELS: Record<OfferDimension, string> = {
    compensation: "Compensation",
    growth: "Growth",
    techStack: "Tech Stack",
    brand: "Brand",
    flexibility: "Flexibility",
    location: "Location",
};

export type OfferWeights = Record<OfferDimension, number>;

export const defaultOfferWeights: OfferWeights = {
    compensation: 30,
    growth: 20,
    techStack: 20,
    brand: 15,
    flexibility: 10,
    location: 5,
};

export interface ScoredDimension {
    dimension: OfferDimension;
    /** Normalized 0-100 score across the set. */
    score: number;
    /** Weighted contribution to the overall score, in points. */
    contribution: number;
    /** Raw underlying value before normalization (for transparency). */
    raw: number;
}

export interface IntelligentOffer {
    offer: Offer;
    id: string;
    /** Overall 0-100 fit score. */
    overall: number;
    dimensions: Record<OfferDimension, ScoredDimension>;
    rank: number;
    isBest: boolean;
}

export interface RankingRationale {
    /** Why the #1 offer ranks first (its strongest weighted dimensions). */
    whyTop: string;
    /** For each non-winner: what would need to change to become #1. */
    pathsToTop: { id: string; company: string; message: string }[];
}

export interface OfferIntelligenceResult {
    offers: IntelligentOffer[];
    rationale: RankingRationale;
    weights: OfferWeights;
}

/* ----------------------------- Raw extractors ---------------------------- */

function cash(o: Offer): number {
    return (o.salaryBase || 0) + (o.bonus || 0) + (o.signingBonus || 0);
}

function flexibilityRaw(o: Offer): number {
    // Remote 100, hybrid 60, onsite 25; plus PTO contribution (capped).
    const remote = o.remoteType === "remote" ? 100 : o.remoteType === "hybrid" ? 60 : 25;
    const pto = Math.min(40, (o.ptoDays ?? 0) * 1.5);
    return remote * 0.7 + pto * 0.75; // ~0..100
}

function locationRaw(o: Offer): number {
    // Remote is location-agnostic (full marks). Otherwise a present location is
    // a mild positive over an unknown one. This is intentionally simple and
    // explainable; users can down-weight it.
    if (o.remoteType === "remote") return 100;
    if (o.location && o.location.trim()) return 60;
    return 40;
}

function rawValue(o: Offer, d: OfferDimension): number {
    switch (d) {
        case "compensation":
            return cash(o);
        case "growth":
            return o.growthScore ?? 0;
        case "techStack":
            return Array.isArray(o.techStack) ? o.techStack.length : 0;
        case "brand":
            return o.brandScore ?? 0;
        case "flexibility":
            return flexibilityRaw(o);
        case "location":
            return locationRaw(o);
    }
}

function normalizeWeights(w: OfferWeights): OfferWeights {
    const total = OFFER_DIMENSIONS.reduce((s, d) => s + Math.max(0, w[d]), 0) || 1;
    return OFFER_DIMENSIONS.reduce((acc, d) => {
        acc[d] = Math.max(0, w[d]) / total;
        return acc;
    }, {} as OfferWeights);
}

function offerKey(o: Offer, i: number): string {
    return o._id || o.offerId || `offer-${i}`;
}

/**
 * Score offers across all six dimensions and combine with weights into an
 * overall fit score. Dimension scores are min-max normalized across the set
 * (best = 100). Throws nothing; returns an empty result for an empty set.
 */
export function analyzeOffers(
    offers: Offer[],
    weights: OfferWeights = defaultOfferWeights
): OfferIntelligenceResult {
    if (offers.length === 0) {
        return { offers: [], rationale: { whyTop: "", pathsToTop: [] }, weights };
    }

    const w = normalizeWeights(weights);

    // Per-dimension min/max for normalization.
    const ranges = OFFER_DIMENSIONS.reduce((acc, d) => {
        const vals = offers.map((o) => rawValue(o, d));
        acc[d] = { min: Math.min(...vals), max: Math.max(...vals) };
        return acc;
    }, {} as Record<OfferDimension, { min: number; max: number }>);

    const normalize = (val: number, d: OfferDimension) => {
        const { min, max } = ranges[d];
        if (max === min) return 100; // all equal → full marks
        return ((val - min) / (max - min)) * 100;
    };

    const scored: IntelligentOffer[] = offers.map((o, i) => {
        const dimensions = OFFER_DIMENSIONS.reduce((acc, d) => {
            const raw = rawValue(o, d);
            const score = Math.round(normalize(raw, d));
            acc[d] = {
                dimension: d,
                score,
                contribution: Math.round(score * w[d] * 10) / 10,
                raw,
            };
            return acc;
        }, {} as Record<OfferDimension, ScoredDimension>);

        const overall =
            Math.round(
                OFFER_DIMENSIONS.reduce((s, d) => s + dimensions[d].contribution, 0) * 10
            ) / 10;

        return { offer: o, id: offerKey(o, i), overall, dimensions, rank: 0, isBest: false };
    });

    scored.sort((a, b) => b.overall - a.overall);
    scored.forEach((s, i) => {
        s.rank = i + 1;
        s.isBest = i === 0 && (scored.length === 1 || s.overall > scored[1].overall - 1e-9);
    });

    return {
        offers: scored,
        rationale: buildRationale(scored, w),
        weights,
    };
}

function topDimensions(o: IntelligentOffer, w: OfferWeights, n = 2): OfferDimension[] {
    return [...OFFER_DIMENSIONS]
        .sort((a, b) => o.dimensions[b].contribution - o.dimensions[a].contribution)
        .slice(0, n);
}

function buildRationale(scored: IntelligentOffer[], w: OfferWeights): RankingRationale {
    if (scored.length === 0) return { whyTop: "", pathsToTop: [] };
    const top = scored[0];
    const company = top.offer.company;
    const drivers = topDimensions(top, w).map((d) => DIMENSION_LABELS[d]);

    const whyTop = `${company} ranks #1 (${top.overall}/100), driven mainly by ${drivers.join(
        " and "
    )}. It leads on the dimensions you weighted most heavily.`;

    const pathsToTop = scored.slice(1).map((o) => {
        const gap = Math.round((top.overall - o.overall) * 10) / 10;
        // Find the dimension where this offer loses the most ground vs the top.
        let worstDim: OfferDimension = OFFER_DIMENSIONS[0];
        let worstDelta = -Infinity;
        for (const d of OFFER_DIMENSIONS) {
            const delta = top.dimensions[d].contribution - o.dimensions[d].contribution;
            if (delta > worstDelta) {
                worstDelta = delta;
                worstDim = d;
            }
        }
        const dimLabel = DIMENSION_LABELS[worstDim];
        const message =
            worstDelta > 0
                ? `${o.offer.company} trails by ${gap} pts. Its biggest gap is ${dimLabel} — improving ${dimLabel.toLowerCase()} (or weighting it lower) would close most of the distance to #1.`
                : `${o.offer.company} trails by ${gap} pts across evenly matched dimensions; a small weight change could flip the ranking.`;
        return { id: o.id, company: o.offer.company, message };
    });

    return { whyTop, pathsToTop };
}

/**
 * What-if simulator: re-run the analysis with adjusted weights and report how
 * the ranking changed relative to a baseline result. Pure — safe to call on
 * every slider movement.
 */
export interface WhatIfResult extends OfferIntelligenceResult {
    /** Movement per offer: positive = moved up the ranking. */
    movement: { id: string; company: string; from: number; to: number; delta: number }[];
    /** Whether the #1 offer changed vs the baseline. */
    winnerChanged: boolean;
    previousWinnerId?: string;
    newWinnerId?: string;
}

export function simulateWhatIf(
    offers: Offer[],
    baseline: OfferIntelligenceResult,
    nextWeights: OfferWeights
): WhatIfResult {
    const next = analyzeOffers(offers, nextWeights);
    const prevRank = new Map(baseline.offers.map((o) => [o.id, o.rank]));

    const movement = next.offers.map((o) => {
        const from = prevRank.get(o.id) ?? o.rank;
        return {
            id: o.id,
            company: o.offer.company,
            from,
            to: o.rank,
            delta: from - o.rank, // positive → moved up
        };
    });

    const previousWinnerId = baseline.offers.find((o) => o.rank === 1)?.id;
    const newWinnerId = next.offers.find((o) => o.rank === 1)?.id;

    return {
        ...next,
        movement,
        winnerChanged: Boolean(previousWinnerId && newWinnerId && previousWinnerId !== newWinnerId),
        previousWinnerId,
        newWinnerId,
    };
}
