"use client";
import React from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/primitives";
import { TrendingUpIcon, ArrowRightIcon } from "./ui/icons";

type Anchor = "features" | "how-it-works" | "pricing";

interface MarketingShellProps {
    children: React.ReactNode;
    activeAnchor?: Anchor;
}

const navItems: { id: Anchor; label: string; href: string }[] = [
    { id: "features", label: "Features", href: "/#features" },
    { id: "how-it-works", label: "How it works", href: "/#how-it-works" },
    { id: "pricing", label: "Pricing", href: "/pricing" },
];

// Only real destinations — no placeholder links.
const footerColumns: { heading: string; links: { label: string; href: string }[] }[] = [
    {
        heading: "Product",
        links: [
            { label: "Features", href: "/#features" },
            { label: "How it works", href: "/#how-it-works" },
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

function Logo({ className }: { className?: string }) {
    return (
        <Link
            href="/"
            className={`flex items-center gap-2 text-[var(--text)] ${className ?? ""}`}
            aria-label="TrackIQ home"
        >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <TrendingUpIcon size={18} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
                TrackIQ
            </span>
        </Link>
    );
}

export default function MarketingShell({ children, activeAnchor }: MarketingShellProps) {
    return (
        <div className="flex min-h-dvh flex-col">
            <a
                href="#main"
                className="sr-only rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50"
            >
                Skip to content
            </a>
            {/* Sticky frosted topbar that stays pinned as content scrolls beneath it. */}
            <header className="glass-panel sticky top-0 z-30 border-b border-[var(--border)]">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8">
                        <Logo />
                        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
                            {navItems.map(({ id, label, href }) => {
                                const active = activeAnchor === id;
                                return (
                                    <Link
                                        key={id}
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className={`text-sm font-medium transition-colors duration-200 ${
                                            active
                                                ? "text-[var(--text)]"
                                                : "text-[var(--text-muted)] hover:text-[var(--text)]"
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link href="/sign-in" className="hidden sm:inline-flex">
                            <Button variant="ghost" size="sm">
                                Sign in
                            </Button>
                        </Link>
                        <Link href="/sign-up">
                            <Button size="sm">
                                Get started <ArrowRightIcon size={16} />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main id="main" className="flex-1">{children}</main>

            <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
                <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-10 md:flex-row md:justify-between">
                        <div className="max-w-xs">
                            <Logo />
                            <p className="mt-4 text-sm text-[var(--text-muted)]">
                                A private, explainable workspace for your job search — track,
                                compare, and decide with evidence.
                            </p>
                        </div>
                        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-8">
                            {footerColumns.map((col) => (
                                <div key={col.heading}>
                                    <h2 className="text-sm font-semibold text-[var(--text)]">
                                        {col.heading}
                                    </h2>
                                    <ul className="mt-4 space-y-3 text-sm">
                                        {col.links.map((link) => (
                                            <li key={link.label}>
                                                <Link
                                                    href={link.href}
                                                    className="text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text)]"
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
                    <p className="mt-12 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-muted)]">
                        &copy; {new Date().getFullYear()} TrackIQ. Built with Next.js, MongoDB, Clerk, and Stripe.
                    </p>
                </div>
            </footer>
        </div>
    );
}
