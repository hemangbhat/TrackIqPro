"use client";
import React from "react";
import { useReducedMotion } from "../useReducedMotion";

type Tone = "indigo" | "emerald" | "amber" | "rose";

const TONE_STROKE: Record<Tone, string> = {
    indigo: "stroke-indigo-500",
    emerald: "stroke-emerald-500",
    amber: "stroke-amber-500",
    rose: "stroke-rose-500",
};

const TONE_TEXT: Record<Tone, string> = {
    indigo: "text-indigo-600 dark:text-indigo-300",
    emerald: "text-emerald-600 dark:text-emerald-300",
    amber: "text-amber-600 dark:text-amber-300",
    rose: "text-rose-600 dark:text-rose-300",
};

/** Map a 0-100 score to a semantic tone. */
export function toneForScore(score: number): Tone {
    if (score >= 75) return "emerald";
    if (score >= 50) return "indigo";
    if (score >= 30) return "amber";
    return "rose";
}

/**
 * Accessible 0-100 gauge/score ring rendered as inline SVG. The arc animates
 * its stroke unless the user prefers reduced motion, in which case it renders
 * directly in its final state.
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
    const reduced = useReducedMotion();
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const resolvedTone = tone ?? toneForScore(clamped);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div
            className="relative inline-flex shrink-0 items-center justify-center"
            style={{ width: size, height: size }}
            role="img"
            aria-label={`Score ${clamped} out of 100`}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className="stroke-[var(--border)]"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={`${TONE_STROKE[resolvedTone]} ${reduced ? "" : "transition-[stroke-dashoffset] duration-700 ease-out"}`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`font-display text-xl font-bold leading-none ${TONE_TEXT[resolvedTone]}`}>
                    {label ?? clamped}
                </span>
                {sublabel && (
                    <span className="font-mono-label mt-1 text-[9px] uppercase text-[var(--text-muted)]">
                        {sublabel}
                    </span>
                )}
            </div>
        </div>
    );
}
