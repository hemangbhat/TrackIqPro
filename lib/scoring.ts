// Weighted offer decision engine.
// Scores are normalized across the current offer set (min-max) so the
// resulting 0-100 number is a relative ranking, not an absolute value.

export type ScoreableOffer = {
    salaryBase: number;
    bonus?: number;
    equity?: number;
    signingBonus?: number;
    growthScore?: number; // 0-10 qualitative
    brandScore?: number; // 0-10 qualitative
};

export type Weights = {
    salary: number;
    equity: number;
    growth: number;
    brand: number;
};

export const defaultWeights: Weights = {
    salary: 0.4,
    equity: 0.2,
    growth: 0.2,
    brand: 0.2,
};

export const weightLabels: Record<keyof Weights, string> = {
    salary: "Cash (base + bonus + signing)",
    equity: "Equity",
    growth: "Growth potential",
    brand: "Company brand",
};

/** Normalize raw weights so they always sum to 1. */
export function normalizeWeights(weights: Weights): Weights {
    const total =
        weights.salary + weights.equity + weights.growth + weights.brand || 1;
    return {
        salary: weights.salary / total,
        equity: weights.equity / total,
        growth: weights.growth / total,
        brand: weights.brand / total,
    };
}

function cash(o: ScoreableOffer): number {
    return (o.salaryBase || 0) + (o.bonus || 0) + (o.signingBonus || 0);
}

type Factor = "salary" | "equity" | "growth" | "brand";

function rawValue(o: ScoreableOffer, factor: Factor): number {
    switch (factor) {
        case "salary":
            return cash(o);
        case "equity":
            return o.equity || 0;
        case "growth":
            return o.growthScore ?? 0;
        case "brand":
            return o.brandScore ?? 0;
    }
}

export type ScoredOffer<T extends ScoreableOffer = ScoreableOffer> = T & {
    score: number; // 0-100
    breakdown: Record<Factor, number>; // each factor's contribution to the score (0-100 scale)
    isBest: boolean;
};

/**
 * Score a set of offers relative to each other.
 * Returns the same offers augmented with a 0-100 score, a per-factor
 * breakdown, and a flag marking the top offer.
 */
export function scoreOffers<T extends ScoreableOffer>(
    offers: T[],
    weights: Weights
): ScoredOffer<T>[] {
    if (offers.length === 0) return [];

    const w = normalizeWeights(weights);
    const factors: Factor[] = ["salary", "equity", "growth", "brand"];

    // Min/max per factor across the set for normalization.
    const ranges = factors.reduce((acc, f) => {
        const values = offers.map((o) => rawValue(o, f));
        acc[f] = { min: Math.min(...values), max: Math.max(...values) };
        return acc;
    }, {} as Record<Factor, { min: number; max: number }>);

    const norm = (value: number, f: Factor) => {
        const { min, max } = ranges[f];
        if (max === min) return 1; // all equal -> full marks
        return (value - min) / (max - min);
    };

    const scored = offers.map((o) => {
        const breakdown = factors.reduce((acc, f) => {
            acc[f] = norm(rawValue(o, f), f) * w[f] * 100;
            return acc;
        }, {} as Record<Factor, number>);
        const score =
            breakdown.salary + breakdown.equity + breakdown.growth + breakdown.brand;
        return { ...o, score: Math.round(score * 10) / 10, breakdown, isBest: false };
    });

    const topScore = Math.max(...scored.map((s) => s.score));
    scored.forEach((s) => {
        s.isBest = s.score === topScore;
    });

    return scored.sort((a, b) => b.score - a.score);
}

/** Human-readable explanation of how the score is built. */
export function scoreExplanation(weights: Weights): string {
    const w = normalizeWeights(weights);
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    return (
        `Each factor is normalized across your offers (best = 100%), then ` +
        `weighted: cash ${pct(w.salary)}, equity ${pct(w.equity)}, ` +
        `growth ${pct(w.growth)}, brand ${pct(w.brand)}. ` +
        `The weighted total is your 0-100 fit score.`
    );
}
