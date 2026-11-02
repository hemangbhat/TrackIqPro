"use client";
import React from "react";
import { companyInitial } from "../lib/format";

/**
 * Presentation-only company tile: an ink square with the company's first
 * letter. Purely decorative, derived from the `company` string.
 */

const sizeMap: Record<string, string> = {
    sm: "h-9 w-9 text-sm",
    md: "h-11 w-11 text-base",
    lg: "h-14 w-14 text-xl",
};

export default function CompanyLogo({
    company,
    size = "md",
    className,
}: {
    company: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={[
                "inline-flex shrink-0 items-center justify-center font-display font-semibold",
                "bg-[var(--ink)] text-[var(--paper)]",
                sizeMap[size],
                className || "",
            ].join(" ")}
        >
            {companyInitial(company)}
        </span>
    );
}
