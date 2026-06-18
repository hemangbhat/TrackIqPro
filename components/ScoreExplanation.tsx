"use client";
import React from "react";
import { Weights, scoreExplanation } from "../lib/scoring";

interface ScoreExplanationProps {
    weights: Weights;
    /**
     * Pre-computed explanation text. When omitted, the component derives it from
     * the Scoring_Engine via scoreExplanation(weights). Either way the text is
     * produced solely by the Scoring_Engine (Requirement 10.5).
     */
    text?: string;
    className?: string;
}

/**
 * ScoreExplanation surfaces the human-readable scoring rationale produced by the
 * Scoring_Engine for the current Weights. It computes nothing on its own beyond
 * delegating to scoreExplanation.
 */
export function ScoreExplanation({ weights, text, className }: ScoreExplanationProps) {
    const explanation = text ?? scoreExplanation(weights);
    return (
        <p
            className={["text-sm text-[var(--text-muted)]", className]
                .filter(Boolean)
                .join(" ")}
        >
            {explanation}
        </p>
    );
}

export default ScoreExplanation;
