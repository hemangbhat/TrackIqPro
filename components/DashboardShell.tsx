"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { PlanBadge } from "./PlanBadge";
import { Drawer } from "./ui/Drawer";
import {
    LayoutIcon,
    BriefcaseIcon,
    NotesIcon,
    ScaleIcon,
    SettingsIcon,
    TrendingUpIcon,
    MenuIcon,
    PlusIcon,
    SearchIcon,
    HelpIcon,
    BrainIcon,
} from "./ui/icons";

const navLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutIcon, exact: true },
    { href: "/dashboard/intelligence", label: "Intelligence", icon: BrainIcon },
    { href: "/dashboard/jobs", label: "Jobs", icon: BriefcaseIcon },
    { href: "/dashboard/notes", label: "Notes", icon: NotesIcon },
    { href: "/dashboard/offers", label: "Offers", icon: ScaleIcon },
    { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

function isActive(pathname: string, href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname() || "";
    // Resolve exactly one active item: prefer the most specific (longest)
    // matching href so nested routes don't also light up the Overview item.
    const activeHref = navLinks
        .filter(({ href, exact }) => isActive(pathname, href, exact))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <nav className="flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
                const active = href === activeHref;
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                        }`}
                    >
                        <Icon size={18} />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

function BrandMark() {
    return (
        <div className="flex items-center justify-between gap-2 px-2">
            <Link
                href="/dashboard"
                className="flex items-center gap-2.5 font-semibold text-[var(--text)]"
            >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                    <TrendingUpIcon size={18} />
                </span>
                <span className="font-display text-lg tracking-tight">TrackIQ</span>
            </Link>
            <span className="font-mono-label rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-500">
                Pro
            </span>
        </div>
    );
}

function AddJobButton({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <Link
            href="/dashboard/jobs?new=1"
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
            <PlusIcon size={18} />
            Add job
        </Link>
    );
}

/**
 * Sidebar body shared by the desktop rail and the mobile drawer: brand mark,
 * a prominent "Add job" CTA, the primary nav, and a bottom section with the
 * PlanBadge and a Help link.
 */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <>
            <div className="mb-6">
                <BrandMark />
            </div>
            <div className="mb-6 px-1">
                <AddJobButton onNavigate={onNavigate} />
            </div>
            <NavList onNavigate={onNavigate} />
            <div className="mt-auto space-y-3 border-t border-[var(--border)] px-1 pt-4">
                <Link
                    href="/dashboard/settings"
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                    <HelpIcon size={18} />
                    Help &amp; support
                </Link>
                <div className="px-3">
                    <PlanBadge />
                </div>
            </div>
        </>
    );
}

function SearchBox() {
    const [query, setQuery] = useState("");
    return (
        <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="relative hidden sm:block"
        >
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--text-muted)]">
                <SearchIcon size={16} />
            </span>
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search applications"
                placeholder="Search applications, notes, offers..."
                className="min-h-11 w-48 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/70 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent md:w-72"
            />
        </form>
    );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            {/* Desktop sidebar (>= 1024px) */}
            <aside className="glass-panel fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] p-4 lg:flex">
                <SidebarBody />
            </aside>

            {/* Mobile slide-in drawer (< 1024px) — focus trap, Escape, scroll lock */}
            <Drawer
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                title="TrackIQ"
                side="left"
                width="max-w-[16rem]"
            >
                <div className="flex h-full flex-col">
                    <SidebarBody onNavigate={() => setMobileOpen(false)} />
                </div>
            </Drawer>

            {/* Main column */}
            <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
                <header className="glass-panel sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        {/* Drawer-trigger: keyboard + pointer operable, hidden on lg+ */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation menu"
                            aria-expanded={mobileOpen}
                            aria-haspopup="dialog"
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer lg:hidden"
                        >
                            <MenuIcon size={22} />
                        </button>
                        <SearchBox />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <PlanBadge />
                        <Link
                            href="/dashboard/jobs?new=1"
                            aria-label="Quick add job"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] cursor-pointer"
                        >
                            <PlusIcon size={20} />
                        </Link>
                        <ThemeToggle />
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </header>
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}
