"use client";
import React from "react";

type Tone = "indigo" | "emerald" | "amber" | "rose";

// Bars carry the tone; the numeral stays ink so it reads in both themes.
const TONE_FILL: Record<Tone, string> = {
    indigo: "bg-[var(--ultra)]",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
};

/** Map a 0-100 score to a semantic tone. */
export function toneForScore(score: number): Tone {
    if (score >= 75) return "emerald";
    if (score >= 50) return "indigo";
    if (score >= 30) return "amber";
    return "rose";
}

/**
 * Accessible 0-100 score, set as a tabular numeral over a square bar (the
 * typographic grid world has no rings). `size` is the block's width. The bar
 * is drawn at its value immediately; it is data, not decoration.
 */
export function ScoreRing({
    value,
    size = 96,
    strokeWidth = 8,
    tone,
    label,
    sublabel,
}: {
    value: number;
    size?: number;
    strokeWidth?: number;
    tone?: Tone;
    label?: string;
    sublabel?: string;
}) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const resolvedTone = tone ?? toneForScore(clamped);

    return (
        <div
            className="inline-flex shrink-0 flex-col"
            style={{ width: size }}
            role="img"
            aria-label={`Score ${clamped} out of 100`}
        >
            <span className="flex items-baseline gap-1.5">
                <span
                    className="gw-num leading-[0.85] text-[var(--ink)]"
                    style={{ fontSize: Math.round(size * 0.46) }}
                >
                    {label ?? clamped}
                </span>
                {sublabel && <span className="text-xs font-semibold text-[var(--ink-muted)]">{sublabel}</span>}
            </span>
            <span className="mt-2 block bg-[var(--paper-2)]" style={{ height: Math.max(4, Math.round(strokeWidth * 0.75)) }}>
                <span
                    className={`block h-full ${TONE_FILL[resolvedTone]}`}
                    style={{ width: `${clamped}%` }}
                />
            </span>
        </div>
    );
}
