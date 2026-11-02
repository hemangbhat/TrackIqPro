"use client";
import React from "react";

type StatCardProps = {
    label: string;
    value: number | string;
    icon?: React.ReactNode;
    tone?: "indigo" | "violet" | "emerald" | "amber";
    hint?: string;
    /** Optional small trend/eyebrow chip rendered next to the icon. */
    trend?: string;
};

const tones: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-[var(--ultra-text)]",
    violet: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
    emerald: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    amber: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
};

export default function StatCard({
    label,
    value,
    tone = "indigo",
    hint,
    trend,
}: StatCardProps) {
    // A ruled figure: the `surface` class draws the 2px ink rule in the grid
    // world (and lets tests resolve the card container). The icon prop is kept
    // for callers but not drawn: the world has no icon tiles.
    return (
        <div className="surface pb-1 pt-3">
            <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-[var(--ink)]">{label}</span>
                {trend && (
                    <span className={`px-1.5 py-0.5 text-xs font-bold ${tones[tone]}`}>{trend}</span>
                )}
            </div>
            <div className="gw-num mt-5 text-[2.75rem] leading-none text-[var(--ink)]">{value}</div>
            {hint && <div className="mt-2 text-sm text-[var(--ink-muted)]">{hint}</div>}
        </div>
    );
}
