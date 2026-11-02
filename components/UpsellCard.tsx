"use client";
import React from "react";
import Link from "next/link";

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
                "bg-[var(--ultra)] text-[var(--on-ultra)]",
                inline ? "p-4" : "p-6",
                inline
                    ? "flex flex-wrap items-center justify-between gap-4"
                    : "flex flex-col gap-5",
                className || "",
            ].join(" ")}
        >
            <div className="min-w-0">
                <h3 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--on-ultra-muted)]">{description}</p>
            </div>
            <Link href={ctaHref} className={`gw-btn gw-btn-inverse gw-btn-sm ${inline ? "" : "self-start"}`}>
                {ctaLabel}
            </Link>
        </div>
    );
}
