"use client";
import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
    analyzeOffers,
    defaultOfferWeights,
    DIMENSION_LABELS,
    OFFER_DIMENSIONS,
    type OfferDimension,
    type OfferWeights,
} from "../../lib/offer-intelligence";
import { demoOffers } from "../../lib/demo-data";

/*
 * The landing page's what-if simulator: the real Offer Intelligence engine on
 * the three demo offers. Moving a weight re-ranks them; only offers whose rank
 * changed on the last move take the signal colour, so the eye lands on what
 * the change did.
 */

const ROW_SPRING = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;

export default function WhatIfDesk() {
    const [weights, setWeights] = useState<OfferWeights>(defaultOfferWeights);
    const [moved, setMoved] = useState<Set<string>>(new Set());
    // One short status message, sent only when the order changes (not per step).
    const [announcement, setAnnouncement] = useState("");
    const result = useMemo(() => analyzeOffers(demoOffers, weights), [weights]);
    const lastRanks = useRef<Map<string, number>>(
        new Map(result.offers.map((o) => [o.id, o.rank]))
    );

    function setWeight(d: OfferDimension, value: number) {
        const next = { ...weights, [d]: value };
        const nextResult = analyzeOffers(demoOffers, next);
        const changed = new Set(
            nextResult.offers
                .filter((o) => lastRanks.current.get(o.id) !== o.rank)
                .map((o) => o.id)
        );
        if (changed.size > 0) {
            setMoved(changed);
            setAnnouncement(
                `Ranking changed: ${nextResult.offers
                    .map((o) => `${o.rank}. ${o.offer.company}`)
                    .join(", ")}`
            );
            lastRanks.current = new Map(nextResult.offers.map((o) => [o.id, o.rank]));
        }
        setWeights(next);
    }

    function reset() {
        setWeights(defaultOfferWeights);
        setMoved(new Set());
        setAnnouncement("Weights reset to the defaults");
        lastRanks.current = new Map(
            analyzeOffers(demoOffers, defaultOfferWeights).offers.map((o) => [o.id, o.rank])
        );
    }

    const isDefault = OFFER_DIMENSIONS.every((d) => weights[d] === defaultOfferWeights[d]);

    return (
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
            {/* ------------------------------ Weights ------------------------------ */}
            <fieldset className="lg:col-span-4">
                <legend className="flex w-full items-baseline justify-between border-t-2 border-[var(--ink)] pt-3">
                    <span className="gw-label">Your weights</span>
                </legend>
                <div className="mt-2 divide-y divide-[var(--hair)]">
                    {OFFER_DIMENSIONS.map((d) => {
                        const id = `weight-${d}`;
                        return (
                            <div key={d} className="py-2">
                                <div className="flex items-baseline justify-between">
                                    <label htmlFor={id} className="text-[0.9375rem] font-semibold">
                                        {DIMENSION_LABELS[d]}
                                    </label>
                                    <output htmlFor={id} className="gw-num text-lg">
                                        {weights[d]}
                                    </output>
                                </div>
                                <input
                                    id={id}
                                    type="range"
                                    min={0}
                                    max={50}
                                    step={5}
                                    value={weights[d]}
                                    onChange={(e) => setWeight(d, Number(e.target.value))}
                                    className="gw-range"
                                />
                            </div>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={reset}
                    disabled={isDefault}
                    className="gw-btn gw-btn-secondary gw-btn-sm mt-4"
                >
                    Reset weights
                </button>
            </fieldset>

            {/* ------------------------------ Ranking ------------------------------ */}
            <div className="lg:col-span-7 lg:col-start-6">
                <div className="flex items-baseline justify-between border-t-2 border-[var(--ink)] pt-3">
                    <span className="gw-label">Ranking of three sample offers</span>
                    <span className="gw-label text-[var(--ink-muted)]">Score out of 100</span>
                </div>
                <ol aria-label="Offer ranking">
                    {result.offers.map((o) => {
                        const hot = moved.has(o.id);
                        return (
                            <motion.li
                                key={o.id}
                                layout
                                transition={ROW_SPRING}
                                className="grid grid-cols-[3.25rem_1fr_auto] items-start gap-x-4 border-b border-[var(--hair)] py-5 sm:grid-cols-[4.5rem_1fr_auto]"
                            >
                                <span
                                    className={`gw-num text-[2.75rem] leading-[0.85] sm:text-[3.75rem] ${
                                        hot ? "text-[var(--ultra-text)]" : "text-[var(--ink)]"
                                    }`}
                                >
                                    {o.rank}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-xl font-bold leading-tight">{o.offer.company}</span>
                                    <span className="block text-sm text-[var(--ink-muted)]">{o.offer.title}</span>
                                    <span
                                        aria-hidden
                                        className="mt-3 block h-3 bg-[var(--paper-2)]"
                                    >
                                        <span
                                            className={`block h-full origin-left transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                                                hot ? "bg-[var(--ultra)]" : "bg-[var(--ink)]"
                                            }`}
                                            style={{ transform: `scaleX(${o.overall / 100})` }}
                                        />
                                    </span>
                                    <span className="mt-2 block text-sm leading-relaxed text-[var(--ink-muted)]">
                                        {OFFER_DIMENSIONS.filter((d) => o.dimensions[d].contribution > 0)
                                            .sort((a, b) => o.dimensions[b].contribution - o.dimensions[a].contribution)
                                            .map((d) => `${DIMENSION_LABELS[d]} +${o.dimensions[d].contribution.toFixed(1)}`)
                                            .join(", ") || "No weighted dimension adds points"}
                                    </span>
                                </span>
                                <span className="gw-num text-[1.75rem] leading-none sm:text-[2.25rem]">
                                    {o.overall.toFixed(1)}
                                </span>
                            </motion.li>
                        );
                    })}
                </ol>

                <p role="status" aria-atomic="true" className="sr-only">
                    {announcement}
                </p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                        <h3 className="gw-label">Why #1 is #1</h3>
                        <p className="mt-2 text-[0.9375rem] leading-relaxed">{result.rationale.whyTop}</p>
                    </div>
                    <div>
                        <h3 className="gw-label">Path to #1</h3>
                        <ul className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
                            {result.rationale.pathsToTop.map((p) => (
                                <li key={p.id}>{p.message}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
