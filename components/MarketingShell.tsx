"use client";
import React from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/primitives";
import {
    TrendingUpIcon,
    ArrowRightIcon,
    MailIcon,
    GlobeIcon,
} from "./ui/icons";

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

const footerColumns: { heading: string; links: { label: string; href: string }[] }[] = [
    {
        heading: "Product",
        links: [
            { label: "Features", href: "/#features" },
            { label: "How it works", href: "/#how-it-works" },
            { label: "Pricing", href: "/pricing" },
            { label: "Get started", href: "/sign-up" },
        ],
    },
    {
        heading: "Resources",
        links: [
            { label: "Interview guides", href: "/#features" },
            { label: "Offer playbook", href: "/#features" },
            { label: "Changelog", href: "/#how-it-works" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Privacy policy", href: "/#features" },
            { label: "Terms of service", href: "/#features" },
            { label: "Security", href: "/#features" },
        ],
    },
    {
        heading: "Support",
        links: [
            { label: "Help center", href: "/#how-it-works" },
            { label: "Contact us", href: "/sign-in" },
            { label: "Sign in", href: "/sign-in" },
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
        <div className="flex min-h-screen flex-col">
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

            <main className="flex-1">{children}</main>

            <footer className="surface border-t border-[var(--border)]">
                <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-12">
                        {/* Brand blurb + social */}
                        <div className="lg:col-span-4">
                            <Logo />
                            <p className="mt-4 max-w-xs text-sm text-[var(--text-muted)]">
                                The intelligence layer for your job search. Built for candidates
                                who track, compare, and decide with clarity.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <Link
                                    href="/sign-in"
                                    aria-label="Email us"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-200 hover:border-indigo-500 hover:text-indigo-500"
                                >
                                    <MailIcon size={18} />
                                </Link>
                                <Link
                                    href="/"
                                    aria-label="Visit our website"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-200 hover:border-indigo-500 hover:text-indigo-500"
                                >
                                    <GlobeIcon size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* Link columns */}
                        <nav
                            aria-label="Footer"
                            className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8"
                        >
                            {footerColumns.map((col) => (
                                <div key={col.heading}>
                                    <h2 className="font-mono-label text-xs uppercase text-[var(--text)]">
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

                    <div className="mt-12 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[var(--text-muted)]">
                            &copy; {new Date().getFullYear()} TrackIQ. All rights reserved.
                        </p>
                        <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                            Status: Operational
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
