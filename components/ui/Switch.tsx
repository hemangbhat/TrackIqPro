"use client";
import React from "react";

/**
 * An on/off switch in the grid world: a square ink-ruled track with a square
 * thumb that slides across. Name it with `aria-labelledby` (or `aria-label`).
 */
export function Switch({
    checked,
    onChange,
    disabled,
    ...aria
}: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    "aria-labelledby"?: string;
    "aria-label"?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={onChange}
            {...aria}
            className={
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border-2 border-[var(--ink)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ultra-text)] disabled:cursor-not-allowed disabled:opacity-60 " +
                (checked ? "bg-[var(--ultra)]" : "bg-[var(--paper)]")
            }
        >
            <span
                aria-hidden
                className={
                    "inline-block h-4 w-4 transition-transform duration-150 ease-out motion-reduce:transition-none " +
                    (checked ? "translate-x-[1.5rem] bg-[var(--on-ultra)]" : "translate-x-[0.25rem] bg-[var(--ink)]")
                }
            />
        </button>
    );
}
