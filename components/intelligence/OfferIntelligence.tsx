"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { Offer } from "../../types";
import {
    analyzeOffers,
    simulateWhatIf,
    OFFER_DIMENSIONS,
    DIMENSION_LABELS,
    defaultOfferWeights,
    type OfferWeights,
    type OfferDimension,
    type IntelligentOffer,
} from "../../lib/offer-intelligence";
import { Card, Button, EmptyState } from "../ui/primitives";
import {
    ScaleIcon,
    SlidersIcon,
    SparklesIcon,
    TrophyIcon,
    BuildingIcon,
    TargetIcon,
} from "../ui/icons";
import { ScoreRing } from "./ScoreRing";
import { useReducedMotion } from "../useReducedMotion";

const WEIGHTS_STORAGE_KEY = "offerIntelWeights";

/** Coerce any persisted/parsed value onto a valid 0-100 weight set. */
function sanitizeWeights(raw: unknown): OfferWeights {
    if (!raw || typeof raw !== "object") return { ...defaultOfferWeights };
    const r = raw as Record<string, unknown>;
    return OFFER_DIMENSIONS.reduce((acc, d) => {
        const v = Number(r[d]);
        acc[d] = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : defaultOfferWeights[d];
        return acc;
    }, {} as OfferWeights);
}

function loadWeights(): OfferWeights {
    if (typeof window === "undefined") return { ...defaultOfferWeights };
    const saved = window.localStorage.getItem(WEIGHTS_STORAGE_KEY);
    if (!saved) return { ...defaultOfferWeights };
    try {
        return sanitizeWeights(JSON.parse(saved));
    } catch {
        return { ...defaultOfferWeights };
    }
}

function weightsEqual(a: OfferWeights, b: OfferWeights): boolean {
    return OFFER_DIMENSIONS.every((d) => a[d] === b[d]);
}

/* ----------------------------- Sub-components ---------------------------- */

function WeightSlider({
    dimension,
    value,
    onChange,
}: {
    dimension: OfferDimension;
    value: number;
    onChange: (v: number) => void;
}) {
    const id = `offer-weight-${dimension}`;
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-sm font-medium text-[var(--text)]">
                    {DIMENSION_LABELS[dimension]}
                </label>
                <span className="font-mono-label text-[11px] tabular-nums text-[var(--text-muted)]">
                    {value}
                </span>
            </div>
            <input
                id={id}
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={`${DIMENSION_LABELS[dimension]} weight`}
                aria-valuetext={`${value} of 100`}
                className="mt-2 h-11 w-full cursor-pointer accent-indigo-600"
            />
        </div>
    );
}

/** Per-dimension mini bars for one offer. */
function DimensionBars({ offer }: { offer: IntelligentOffer }) {
    return (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {OFFER_DIMENSIONS.map((d) => {
                const score = offer.dimensions[d].score;
                const tone =
                    score >= 75
                        ? "bg-emerald-500"
                        : score >= 50
                          ? "bg-indigo-500"
                          : score >= 30
                            ? "bg-amber-500"
                            : "bg-rose-500";
                return (
                    <div key={d}>
                        <div className="flex items-baseline justify-between gap-1">
                            <span className="truncate text-[11px] text-[var(--text-muted)]">
                                {DIMENSION_LABELS[d]}
                            </span>
                            <span className="font-mono-label text-[10px] tabular-nums text-[var(--text-muted)]">
                                {score}
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                                className={`h-full rounded-full ${tone}`}
                                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                                role="progressbar"
                                aria-valuenow={score}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${DIMENSION_LABELS[d]} score`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** ▲/▼ movement indicator vs the baseline ranking. */
function MovementIndicator({ delta }: { delta: number }) {
    if (delta === 0) {
        return (
            <span
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]"
                title="No change vs default weights"
            >
                <span aria-hidden="true">—</span>
                <span className="sr-only">No rank change</span>
                Hold
            </span>
        );
    }
    const up = delta > 0;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                up
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
            }`}
            title={`Moved ${up ? "up" : "down"} ${Math.abs(delta)} vs default weights`}
        >
            <span aria-hidden="true">{up ? "▲" : "▼"}</span>
            <span className="sr-only">{up ? "Moved up" : "Moved down"}</span>
            {Math.abs(delta)}
        </span>
    );
}

function OfferRankRow({
    offer,
    delta,
    reduced,
}: {
    offer: IntelligentOffer;
    delta: number;
    reduced: boolean;
}) {
    const isBest = offer.isBest;
    return (
        <li
            className={`rounded-2xl border p-4 sm:p-5 ${
                reduced ? "" : "transition-colors"
            } ${
                isBest
                    ? "border-indigo-500/40 bg-indigo-500/[0.06]"
                    : "border-[var(--border)] bg-[var(--surface-2)]/40 hover:border-indigo-500/30"
            }`}
        >
            <div className="flex items-center gap-4">
                {/* Rank + movement */}
                <div className="flex w-12 shrink-0 flex-col items-center gap-1">
                    <span
                        className={`font-display text-lg font-bold leading-none ${
                            isBest ? "text-indigo-600 dark:text-indigo-300" : "text-[var(--text)]"
                        }`}
                    >
                        #{offer.rank}
                    </span>
                    <MovementIndicator delta={delta} />
                </div>

                {/* Identity */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isBest
                                ? "bg-indigo-500/20 text-indigo-500"
                                : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                        }`}
                    >
                        {isBest ? <TrophyIcon size={16} /> : <BuildingIcon size={16} />}
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-[var(--text)]">
                                {offer.offer.company}
                            </span>
                            {isBest && (
                                <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                                    #1
                                </span>
                            )}
                        </div>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                            {offer.offer.title}
                        </p>
                    </div>
                </div>

                {/* Overall score */}
                <ScoreRing
                    value={offer.overall}
                    size={56}
                    strokeWidth={6}
                    tone={isBest ? "indigo" : undefined}
                    sublabel="fit"
                />
            </div>

            <DimensionBars offer={offer} />
        </li>
    );
}

/* ------------------------------- Component ------------------------------- */

/**
 * Offer Intelligence — a premium, fully explainable comparison panel built on
 * the Offer Intelligence Engine (lib/offer-intelligence). Presents the six
 * weighted dimensions, a live what-if simulator, ranking-movement visualization
 * versus the default-weight baseline, and the engine's ranking rationale.
 *
 * Presentation only: all scoring, ranking, and rationale come from the engine.
 */
export function OfferIntelligence({ offers }: { offers: Offer[] }) {
    const reduced = useReducedMotion();
    const [weights, setWeights] = useState<OfferWeights>(() => ({ ...defaultOfferWeights }));

    // Hydrate persisted weights on the client (avoids SSR localStorage access).
    useEffect(() => {
        setWeights(loadWeights());
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
        }
    }, [weights]);

    // Baseline always uses the default weights so movement reflects the impact
    // of the user's adjustments. The live result + movement come from the
    // what-if simulator. Both are pure, so recomputing on every change is safe.
    const { result, baseline } = useMemo(() => {
        const base = analyzeOffers(offers, defaultOfferWeights);
        const live = simulateWhatIf(offers, base, weights);
        return { result: live, baseline: base };
    }, [offers, weights]);

    const movementById = useMemo(
        () => new Map(result.movement.map((m) => [m.id, m.delta])),
        [result.movement]
    );

    const isDefault = weightsEqual(weights, defaultOfferWeights);
    const resetWeights = () => setWeights({ ...defaultOfferWeights });

    /* ----------------------------- Header ----------------------------- */
    const header = (
        <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                <ScaleIcon size={20} />
            </span>
            <div>
                <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    Offer Intelligence
                </p>
                <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
                    Six-dimension fit &amp; what-if simulator
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    Tune what matters and watch the ranking respond — with the reasoning
                    behind every result.
                </p>
            </div>
        </div>
    );

    /* --------------------------- Empty states -------------------------- */
    if (offers.length === 0) {
        return (
            <Card className="glass-panel gradient-border p-6 sm:p-7">
                {header}
                <div className="mt-6">
                    <EmptyState
                        icon={<ScaleIcon size={22} />}
                        title="No offers to analyze yet"
                        description="Add at least two offers to unlock the six-dimension fit analysis, what-if simulator, and ranking rationale."
                    />
                </div>
            </Card>
        );
    }

    if (offers.length === 1) {
        const only = result.offers[0];
        return (
            <Card className="glass-panel gradient-border p-6 sm:p-7">
                {header}
                <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
                    <p className="text-sm font-semibold text-[var(--text)]">
                        Add 2+ offers to compare
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-muted)]">
                        The simulator and ranking rationale compare offers head-to-head.
                        {only ? ` You currently have one offer from ${only.offer.company}.` : ""}{" "}
                        Add another to see how they stack up across all six dimensions.
                    </p>
                </div>
            </Card>
        );
    }

    /* ---------------------------- Full panel --------------------------- */
    return (
        <Card className="glass-panel gradient-border p-6 sm:p-7">
            {header}

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                {/* What-if simulator — sliders */}
                <section aria-label="What-if simulator" className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-indigo-500">
                                <SlidersIcon size={16} />
                            </span>
                            <h3 className="font-display text-base font-semibold text-[var(--text)]">
                                What-if simulator
                            </h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetWeights}
                            disabled={isDefault}
                        >
                            Reset weights
                        </Button>
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">
                        Adjust how much each dimension counts. The ranking on the right updates
                        instantly, with ▲/▼ showing movement versus the default weighting.
                    </p>

                    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 sm:p-5">
                        {OFFER_DIMENSIONS.map((d) => (
                            <WeightSlider
                                key={d}
                                dimension={d}
                                value={weights[d]}
                                onChange={(v) => setWeights((prev) => ({ ...prev, [d]: v }))}
                            />
                        ))}
                    </div>

                    {result.winnerChanged && (
                        <div className="flex items-start gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.07] px-4 py-3">
                            <span className="mt-0.5 shrink-0 text-indigo-500">
                                <SparklesIcon size={16} />
                            </span>
                            <p className="text-sm text-[var(--text)]">
                                <span className="font-semibold">Winner changed.</span> With these
                                weights,{" "}
                                <span className="font-semibold">
                                    {result.offers.find((o) => o.id === result.newWinnerId)?.offer
                                        .company ?? "a different offer"}
                                </span>{" "}
                                now ranks #1 instead of{" "}
                                {baseline.offers.find((o) => o.id === result.previousWinnerId)?.offer
                                    .company ?? "the previous leader"}
                                .
                            </p>
                        </div>
                    )}
                </section>

                {/* Ranking list */}
                <section aria-label="Offer ranking" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-indigo-500">
                            <TrophyIcon size={16} />
                        </span>
                        <h3 className="font-display text-base font-semibold text-[var(--text)]">
                            Live ranking
                        </h3>
                    </div>

                    <ul className="space-y-3">
                        {result.offers.map((o) => (
                            <OfferRankRow
                                key={o.id}
                                offer={o}
                                delta={movementById.get(o.id) ?? 0}
                                reduced={reduced}
                            />
                        ))}
                    </ul>
                </section>
            </div>

            {/* Ranking rationale */}
            <div className="mt-8 border-t border-[var(--border)] pt-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.06] p-5">
                        <div className="flex items-center gap-2">
                            <span className="text-indigo-500">
                                <TrophyIcon size={16} />
                            </span>
                            <h3 className="font-mono-label text-[11px] uppercase text-indigo-500">
                                Why this offer ranks #1
                            </h3>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
                            {result.rationale.whyTop}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-5">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)]">
                                <TargetIcon size={16} />
                            </span>
                            <h3 className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                                What would change the ranking
                            </h3>
                        </div>
                        {result.rationale.pathsToTop.length === 0 ? (
                            <p className="mt-2 text-sm text-[var(--text-muted)]">
                                Only one offer is ranked — add more to see what it would take for
                                another to reach #1.
                            </p>
                        ) : (
                            <ul className="mt-3 space-y-2.5">
                                {result.rationale.pathsToTop.map((p) => (
                                    <li
                                        key={p.id}
                                        className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                                    >
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
                                        <p className="text-sm text-[var(--text)]">{p.message}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default OfferIntelligence;
