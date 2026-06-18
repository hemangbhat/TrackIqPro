"use client";
import React from "react";
import { SlidersIcon } from "./ui/icons";
import { Weights, weightLabels, normalizeWeights } from "../lib/scoring";

/** Each weight slider is constrained to this inclusive range (Requirement 10.4). */
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 100;

/** Clamp a raw slider value into the inclusive [0, 100] range. */
export function clampWeight(value: number): number {
    if (Number.isNaN(value)) return WEIGHT_MIN;
    return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, value));
}

interface WeightSlidersProps {
    weights: Weights;
    onChange: (w: Weights) => void;
    labels?: Record<keyof Weights, string>;
}

/**
 * WeightSliders renders one range input per scoring factor. Values are held on
 * a 0-100 inclusive scale; the displayed percentage is the value's share of the
 * total (via normalizeWeights), matching how the Scoring_Engine weighs factors.
 * This component performs no scoring math — it only emits updated Weights.
 */
export function WeightSliders({
    weights,
    onChange,
    labels = weightLabels,
}: WeightSlidersProps) {
    const norm = normalizeWeights(weights);
    const keys = Object.keys(labels) as (keyof Weights)[];

    return (
        <section className="glass-panel gradient-border rounded-2xl p-6">
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500">
                    <SlidersIcon size={18} />
                </span>
                <div>
                    <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Decision weights
                    </p>
                    <h2 className="font-display text-lg font-semibold text-[var(--text)]">
                        Your priorities
                    </h2>
                </div>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
                Drag to weigh what matters to you. Each factor counts toward your fit score
                in proportion to the others.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {keys.map((key) => {
                    const id = `weight-${key}`;
                    const value = clampWeight(weights[key]);
                    return (
                        <div key={key} className="group">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <label
                                    htmlFor={id}
                                    className="font-mono-label text-[11px] uppercase tracking-wider text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)]"
                                >
                                    {labels[key]}
                                </label>
                                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 font-mono-label text-xs font-semibold text-indigo-500">
                                    {Math.round(norm[key] * 100)}%
                                </span>
                            </div>
                            <input
                                id={id}
                                type="range"
                                min={WEIGHT_MIN}
                                max={WEIGHT_MAX}
                                step={1}
                                value={value}
                                aria-valuemin={WEIGHT_MIN}
                                aria-valuemax={WEIGHT_MAX}
                                aria-valuenow={value}
                                onChange={(e) =>
                                    onChange({
                                        ...weights,
                                        [key]: clampWeight(Number(e.target.value)),
                                    })
                                }
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-2)] accent-indigo-600"
                            />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default WeightSliders;
