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
    indigo: "bg-indigo-500/10 text-indigo-500",
    violet: "bg-violet-500/10 text-violet-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
};

export default function StatCard({
    label,
    value,
    icon,
    tone = "indigo",
    hint,
    trend,
}: StatCardProps) {
    // Keep the `surface` class so the premium glass treatment still reads as a
    // card surface in both themes (and tests can resolve the card container).
    return (
        <div className="surface glass-panel gradient-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <span className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    {trend && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
                            {trend}
                        </span>
                    )}
                    {icon && (
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
                            {icon}
                        </span>
                    )}
                </div>
            </div>
            <div className="font-display tabular mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
                {value}
            </div>
            {hint && <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div>}
        </div>
    );
}
