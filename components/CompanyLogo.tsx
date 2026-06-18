"use client";
import React from "react";

/**
 * Presentation-only company avatar: a rounded tile showing the company's first
 * initial over a soft indigo wash. Purely decorative — derives its content from
 * the `company` string and never fetches or mutates data.
 */
function initial(company: string): string {
    const trimmed = (company || "").trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

const sizeMap: Record<string, string> = {
    sm: "h-9 w-9 text-sm rounded-lg",
    md: "h-11 w-11 text-base rounded-xl",
    lg: "h-14 w-14 text-xl rounded-2xl",
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
                "bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 text-indigo-600 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-300",
                sizeMap[size],
                className || "",
            ].join(" ")}
        >
            {initial(company)}
        </span>
    );
}
