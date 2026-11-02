import React from "react";
import { computeJobFit, type FitReason } from "../../lib/career-fit";
import { demoJobs, DEMO_PROFILE } from "../../lib/demo-data";

/*
 * The landing page's hero diagram: one real Job Fit score drawn as a waterfall.
 * Every number comes from lib/career-fit running on the public demo dataset —
 * nothing is hardcoded. The engine's "what helped" contributions sum to the
 * score, so the solid bars climb from 0 to the total; "what held it back"
 * items hang below the baseline as hatched bars (points the role didn't earn).
 */

export const waterfallJob = demoJobs[0];
export const waterfallFit = computeJobFit(waterfallJob, DEMO_PROFILE);

const gains = waterfallFit.whatHelped.filter((r) => r.impact > 0);
const losses = waterfallFit.whatReduced.filter((r) => r.impact < 0);
const maxLoss = Math.max(0, ...losses.map((r) => -r.impact));
// Vertical scale: 100 points above the baseline, the largest loss below it.
const aboveShare = 100 / (100 + maxLoss);

function signed(n: number) {
    return `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;
}

/**
 * A numeral that counts up once on entry (CSS @property counter, see
 * .gw-tick in globals.css). The real value is in the accessible text; the
 * counter is presentational. Without @property support, or under reduced
 * motion, it simply shows the final value.
 */
function Tick({ value, sign, delay = 0 }: { value: number; sign?: boolean; delay?: number }) {
    const prefix = sign ? (value >= 0 ? "+" : "−") : "";
    return (
        <>
            <span className="sr-only">{sign ? signed(value) : value}</span>
            <span
                aria-hidden
                className="gw-tick"
                data-prefix={prefix}
                style={{ "--gw-n": Math.abs(value), animationDelay: `${delay}ms` } as React.CSSProperties}
            />
        </>
    );
}

/** Short, diagram-sized label: the engine's sentence without its parenthetical list. */
function shortLabel(r: FitReason) {
    return r.label.replace(/\s*\(.*\)\s*$/, "");
}

function detail(r: FitReason) {
    const m = r.label.match(/\((.*)\)\s*$/);
    return m ? m[1] : null;
}

export default function ScoreWaterfall() {
    let running = 0;
    const columns = gains.length + losses.length;

    return (
        <figure className="relative">
            <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-[var(--ink-muted)]">
                <span>
                    <span className="font-bold text-[var(--ink)]">Job fit</span> for {waterfallJob.title} at{" "}
                    {waterfallJob.company}
                </span>
                <span>Computed live by the real engine, on sample data</span>
            </figcaption>

            {/* --------------------------- Desktop: waterfall --------------------------- */}
            <div
                className="hidden md:grid"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) minmax(0, 1.55fr)`,
                    columnGap: "1.5rem",
                }}
            >
                {gains.map((r, i) => {
                    const start = running;
                    running += r.impact;
                    return (
                        <Column key={r.label} reason={r} index={i}>
                            <div
                                className="absolute inset-x-0"
                                style={{
                                    bottom: `${(start / 100) * 100}%`,
                                    height: `${(r.impact / 100) * 100}%`,
                                }}
                            >
                                <span className="gw-num absolute bottom-full left-0 mb-1.5 text-[clamp(1.75rem,2.6vw,2.75rem)] leading-none text-[var(--ink)]">
                                    <Tick value={r.impact} sign delay={120 + i * 110} />
                                </span>
                                <div
                                    className="gw-rise h-full bg-[var(--ink)]"
                                    style={{ animationDelay: `${120 + i * 110}ms` }}
                                />
                            </div>
                        </Column>
                    );
                })}
                {losses.map((r, i) => (
                    <Column key={r.label} reason={r} index={gains.length + i} loss>
                        <span className="gw-num absolute bottom-2 left-0 text-[clamp(1.75rem,2.6vw,2.75rem)] leading-none text-[var(--ink)]">
                            <Tick value={r.impact} sign delay={120 + (gains.length + i) * 110} />
                        </span>
                    </Column>
                ))}

                {/* Total: the ultramarine field. */}
                <div
                    className="row-span-2 flex flex-col justify-between bg-[var(--ultra)] p-5 text-[var(--on-ultra)] lg:p-7"
                    style={{ gridColumn: columns + 1, gridRow: "1 / span 2" }}
                >
                    <span className="gw-label text-[var(--on-ultra-muted)]">Score out of 100</span>
                    <span className="gw-num gw-wide text-[clamp(6rem,11vw,11rem)] leading-[0.78]">
                        <Tick value={waterfallFit.score} delay={120} />
                    </span>
                    <span className="text-sm leading-snug text-[var(--on-ultra-muted)]">
                        {waterfallFit.summary}
                    </span>
                </div>
            </div>

            {/* ----------------------------- Mobile: ledger ----------------------------- */}
            <div className="md:hidden">
                {/* The total leads on phones so the score is in the first screen. */}
                <div className="mb-4 flex items-end justify-between gap-4 bg-[var(--ultra)] p-5 text-[var(--on-ultra)]">
                    <span className="gw-num gw-wide text-[6.5rem] leading-[0.8]">
                        <Tick value={waterfallFit.score} />
                    </span>
                    <span className="max-w-[11rem] text-right text-sm leading-snug text-[var(--on-ultra-muted)]">
                        Score out of 100, built from the reasons below
                    </span>
                </div>
                <ul className="border-t-2 border-[var(--ink)]">
                    {[...gains, ...losses].map((r) => (
                        <li key={r.label} className="grid grid-cols-[4.5rem_1fr] gap-x-4 border-b border-[var(--hair)] py-3">
                            <span className="gw-num text-[1.75rem] leading-none">{signed(r.impact)}</span>
                            <span>
                                <span
                                    aria-hidden
                                    className={`gw-grow-x mb-2 block h-3 ${r.impact >= 0 ? "bg-[var(--ink)]" : "gw-hatch text-[var(--ink)]"}`}
                                    style={{ width: `${Math.abs(r.impact)}%` }}
                                />
                                <span className="text-sm leading-snug text-[var(--ink-muted)]">{r.label}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </figure>
    );
}

/** One contribution column: the plot area (above + below the baseline) and its label. */
function Column({
    reason,
    index,
    loss = false,
    children,
}: {
    reason: FitReason;
    index: number;
    loss?: boolean;
    children?: React.ReactNode;
}) {
    const more = detail(reason);
    return (
        <>
            <div
                className="relative h-[clamp(10rem,24vh,13rem)]"
                style={{ gridColumn: index + 1, gridRow: 1 }}
            >
                {/* Above the baseline (0..100 points). */}
                <div className="absolute inset-x-0 top-0" style={{ height: `${aboveShare * 100}%` }}>
                    {children}
                </div>
                {/* The baseline, carried across the gap into the next column. */}
                <div
                    className="absolute -right-6 left-0 border-t-2 border-[var(--ink)]"
                    style={{ top: `${aboveShare * 100}%` }}
                    aria-hidden
                />
                {/* Below the baseline: losses. */}
                {loss && (
                    <div
                        className="absolute inset-x-0"
                        style={{
                            top: `${aboveShare * 100}%`,
                            height: `${(-reason.impact / (100 + maxLoss)) * 100}%`,
                        }}
                    >
                        <div
                            className="gw-drop gw-hatch h-full text-[var(--ink)]"
                            style={{ animationDelay: `${120 + index * 110}ms` }}
                        />
                    </div>
                )}
            </div>
            <div className="pt-3" style={{ gridColumn: index + 1, gridRow: 2 }}>
                <p className="text-[0.9375rem] font-semibold leading-snug text-[var(--ink)]">
                    {shortLabel(reason)}
                </p>
                {more && <p className="mt-1 text-sm leading-snug text-[var(--ink-muted)]">{more}</p>}
            </div>
        </>
    );
}
