"use client";
import React from "react";
import Link from "next/link";
import { Button } from "./ui/primitives";
import { SparklesIcon, ArrowRightIcon } from "./ui/icons";

type UpsellCardProps = {
    title?: string;
    description?: string;
    /** Destination for the upgrade CTA. Defaults to the pricing page. */
    ctaHref?: string;
    /** CTA label. Defaults to "Upgrade to Pro". */
    ctaLabel?: string;
    variant?: "card" | "inline";
    className?: string;
};

/**
 * Upsell prompt shown to Free_User surfaces (e.g. the dashboard) inviting an
 * upgrade to Pro. Uses SVG icons only and navigates to the pricing page.
 */
export default function UpsellCard({
    title = "Unlock TrackIQ Pro",
    description = "Export your data, compare unlimited offers, and remove the application limit.",
    ctaHref = "/pricing",
    ctaLabel = "Upgrade to Pro",
    variant = "card",
    className,
}: UpsellCardProps) {
    const inline = variant === "inline";

    return (
        <div
            className={[
                "rounded-2xl border border-indigo-500/30 bg-indigo-500/5 shadow-sm",
                inline ? "p-4" : "p-6",
                inline
                    ? "flex flex-wrap items-center justify-between gap-4"
                    : "flex flex-col gap-4",
                className || "",
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500">
                    <SparklesIcon size={18} />
                </span>
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
                </div>
            </div>
            <Link href={ctaHref} className={inline ? "" : "self-start"}>
                <Button>
                    {ctaLabel} <ArrowRightIcon size={16} />
                </Button>
            </Link>
        </div>
    );
}
