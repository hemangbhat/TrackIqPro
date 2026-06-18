"use client";
import React from "react";
import { Job } from "../types";
import { Card } from "./ui/primitives";
import { CheckIcon, ActivityIcon } from "./ui/icons";

type Stage = Job["stage"];

interface StageStepperProps {
    current: Stage;
    onChange: (next: Stage) => void;
    disabled?: boolean;
}

// Linear progression pipeline.
const PIPELINE: Stage[] = ["applied", "screening", "interview", "offer", "accepted"];
// Terminal branches that can be reached from anywhere.
const TERMINAL: Stage[] = ["rejected", "withdrawn"];

function label(stage: Stage) {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export default function StageStepper({ current, onChange, disabled }: StageStepperProps) {
    const currentIndex = PIPELINE.indexOf(current);
    const onTerminal = TERMINAL.includes(current);

    return (
        <Card className="glass-panel gradient-border p-6">
            <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                    <span className="text-indigo-500">
                        <ActivityIcon size={18} aria-hidden="true" />
                    </span>
                    Stage
                </h2>
                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 font-mono-label text-[11px] uppercase text-indigo-600 dark:text-indigo-300">
                    {current}
                </span>
            </div>

            {/* Linear pipeline */}
            <ol className="flex items-center" aria-label="Application stage">
                {PIPELINE.map((stage, idx) => {
                    const reached = currentIndex >= 0 && idx <= currentIndex;
                    const isCurrent = stage === current;
                    return (
                        <li key={stage} className="flex flex-1 flex-col items-center">
                            <div className="flex w-full items-center">
                                {idx > 0 && (
                                    <div
                                        className={`h-0.5 flex-1 ${
                                            currentIndex >= 0 && idx <= currentIndex
                                                ? "bg-indigo-500"
                                                : "bg-[var(--border)]"
                                        }`}
                                    />
                                )}
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChange(stage)}
                                    aria-current={isCurrent ? "step" : undefined}
                                    aria-label={`Set stage to ${label(stage)}`}
                                    className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50 ${
                                        isCurrent
                                            ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/40"
                                            : reached
                                              ? "bg-indigo-600 text-white"
                                              : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--border)]/40"
                                    }`}
                                >
                                    {reached && !isCurrent ? <CheckIcon size={16} /> : idx + 1}
                                </button>
                                {idx < PIPELINE.length - 1 && (
                                    <div
                                        className={`h-0.5 flex-1 ${
                                            currentIndex >= 0 && idx < currentIndex
                                                ? "bg-indigo-500"
                                                : "bg-[var(--border)]"
                                        }`}
                                    />
                                )}
                            </div>
                            <span
                                className={`mt-2 text-[11px] capitalize ${
                                    isCurrent ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]"
                                }`}
                            >
                                {label(stage)}
                            </span>
                        </li>
                    );
                })}
            </ol>

            {/* Terminal branches */}
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                <span className="mr-1 text-xs text-[var(--text-muted)]">Mark as:</span>
                {TERMINAL.map((stage) => {
                    const isCurrent = stage === current;
                    return (
                        <button
                            key={stage}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(stage)}
                            aria-current={isCurrent ? "step" : undefined}
                            aria-label={`Set stage to ${label(stage)}`}
                            className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 py-1 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50 ${
                                isCurrent
                                    ? stage === "rejected"
                                        ? "bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/40 dark:text-rose-300"
                                        : "bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/40 dark:text-slate-300"
                                    : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--border)]/40"
                            }`}
                        >
                            {label(stage)}
                        </button>
                    );
                })}
                {onTerminal && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                        This application is {current}.
                    </span>
                )}
            </div>
        </Card>
    );
}
