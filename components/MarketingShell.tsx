"use client";
import React from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

type Anchor = "what-if" | "engines" | "pricing" | "demo";

interface MarketingShellProps {
    children: React.ReactNode;
    activeAnchor?: Anchor;
}

const navItems: { id: Anchor; label: string; href: string }[] = [
    { id: "what-if", label: "How scoring works", href: "/#what-if" },
    { id: "engines", label: "Engines", href: "/#engines" },
    { id: "pricing", label: "Pricing", href: "/pricing" },
    { id: "demo", label: "Demo", href: "/demo" },
];

// Only real destinations — no placeholder links.
const footerColumns: { heading: string; links: { label: string; href: string }[] }[] = [
    {
        heading: "Product",
        links: [
            { label: "How scoring works", href: "/#what-if" },
            { label: "Engines", href: "/#engines" },
            { label: "Pricing", href: "/pricing" },
            { label: "Live demo", href: "/demo" },
        ],
    },
    {
        heading: "Account",
        links: [
            { label: "Create account", href: "/sign-up" },
            { label: "Sign in", href: "/sign-in" },
            { label: "Privacy", href: "/privacy" },
        ],
    },
];

const toggleClass =
    "inline-flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]";

function Wordmark({ className }: { className?: string }) {
    return (
        <Link
            href="/"
            className={`gw-display gw-wide text-[1.375rem] leading-none text-[var(--ink)] no-underline ${className ?? ""}`}
            aria-label="TrackIQ home"
        >
            TrackIQ
        </Link>
    );
}

export default function MarketingShell({ children, activeAnchor }: MarketingShellProps) {
    return (
        <div className="grid-world flex min-h-dvh flex-col">
            <a
                href="#main"
                className="sr-only bg-[var(--ultra)] px-4 py-2 text-sm font-bold text-[var(--on-ultra)] focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50"
            >
                Skip to content
            </a>
            <header className="sticky top-0 z-30 border-b-2 border-[var(--ink)] bg-[var(--paper)]">
                <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-8 lg:px-12">
                    <div className="flex items-center gap-10">
                        <Wordmark />
                        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
                            {navItems.map(({ id, label, href }) => {
                                const active = activeAnchor === id;
                                return (
                                    <Link
                                        key={id}
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className={`text-[0.9375rem] font-semibold decoration-2 underline-offset-[0.35em] transition-colors duration-150 hover:underline ${
                                            active
                                                ? "text-[var(--ink)] underline decoration-[var(--ultra-text)]"
                                                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-flex">
                            <ThemeToggle className={toggleClass} />
                        </span>
                        <Link
                            href="/sign-in"
                            className="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-[var(--ink)] decoration-2 underline-offset-[0.35em] hover:underline"
                        >
                            Sign in
                        </Link>
                        <Link href="/sign-up" className="gw-btn gw-btn-primary gw-btn-sm">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main id="main" className="flex-1">{children}</main>

            <footer className="border-t-2 border-[var(--ink)]">
                <div className="mx-auto w-full max-w-[90rem] px-4 pb-10 pt-14 sm:px-8 lg:px-12">
                    <div className="grid gap-12 md:grid-cols-12">
                        <div className="md:col-span-6">
                            <Wordmark className="text-[2.5rem] sm:text-[3.5rem]" />
                            <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
                                A private, explainable workspace for your job search. Track,
                                compare, and decide with reasons you can read.
                            </p>
                        </div>
                        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-6">
                            {footerColumns.map((col) => (
                                <div key={col.heading} className="border-t-2 border-[var(--ink)] pt-3">
                                    <h2 className="gw-label text-[var(--ink)]">{col.heading}</h2>
                                    <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
                                        {col.links.map((link) => (
                                            <li key={link.label}>
                                                <Link
                                                    href={link.href}
                                                    className="text-[var(--ink-muted)] decoration-2 underline-offset-[0.3em] transition-colors duration-150 hover:text-[var(--ink)] hover:underline"
                                                >
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-16 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hair)] pt-5 text-xs text-[var(--ink-muted)]">
                        <span>&copy; {new Date().getFullYear()} TrackIQ</span>
                        <span className="sm:hidden">
                            <ThemeToggle className={toggleClass} />
                        </span>
                        <span className="hidden sm:inline">Scores computed from your data alone.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
