"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    MenuIcon,
    PlusIcon,
    SearchIcon,
    ShieldIcon,
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

const toggleClass =
    "inline-flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]";

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
        <nav aria-label="Dashboard" className="flex flex-col border-t-2 border-[var(--ink)]">
            {navLinks.map(({ href, label, icon: Icon }) => {
                const active = href === activeHref;
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-3 border-b border-[var(--hair)] px-3 text-[0.9375rem] font-semibold transition-colors duration-150 ${
                            active
                                ? "bg-[var(--ultra)] text-[var(--on-ultra)]"
                                : "text-[var(--ink-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
                        }`}
                    >
                        <Icon size={18} aria-hidden />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

/**
 * Sidebar body shared by the desktop rail and the mobile drawer: the wordmark,
 * the "Add job" action, the primary nav, and a foot with Privacy and the plan.
 */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <>
            <Link
                href="/dashboard"
                onClick={onNavigate}
                className="gw-display gw-wide mb-6 block px-1 text-[1.5rem] leading-none text-[var(--ink)]"
            >
                TrackIQ
            </Link>
            <Link
                href="/dashboard/jobs?new=1"
                onClick={onNavigate}
                className="gw-btn gw-btn-primary mb-6 w-full"
            >
                <PlusIcon size={18} aria-hidden />
                Add job
            </Link>
            <NavList onNavigate={onNavigate} />
            <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-[var(--ink)] pt-3">
                <Link
                    href="/privacy"
                    onClick={onNavigate}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]"
                >
                    <ShieldIcon size={16} aria-hidden />
                    Privacy &amp; data
                </Link>
                <PlanBadge />
            </div>
        </>
    );
}

function SearchBox() {
    const [query, setQuery] = useState("");
    const router = useRouter();
    return (
        <form
            role="search"
            onSubmit={(e) => {
                e.preventDefault();
                const q = query.trim();
                if (q) router.push(`/dashboard/jobs?q=${encodeURIComponent(q)}`);
            }}
            className="relative hidden sm:block"
        >
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--ink-muted)]">
                <SearchIcon size={16} aria-hidden />
            </span>
            <input
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search applications"
                placeholder="Search applications"
                className="min-h-11 w-48 border border-[var(--hair)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] transition-colors duration-150 focus:border-[var(--ultra-text)] focus:outline-none md:w-72"
            />
        </form>
    );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="grid-world flex min-h-dvh">
            <a
                href="#main"
                className="sr-only bg-[var(--ultra)] px-4 py-2 text-sm font-bold text-[var(--on-ultra)] focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50"
            >
                Skip to content
            </a>
            {/* Desktop sidebar (>= 1024px) */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r-2 border-[var(--ink)] bg-[var(--paper)] p-4 lg:flex">
                <SidebarBody />
            </aside>

            {/* Mobile slide-in drawer (< 1024px): focus trap, Escape, scroll lock */}
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
            <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b-2 border-[var(--ink)] bg-[var(--paper)] px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        {/* Drawer trigger: keyboard and pointer operable, hidden on lg+ */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation menu"
                            aria-expanded={mobileOpen}
                            aria-haspopup="dialog"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--paper-2)] lg:hidden"
                        >
                            <MenuIcon size={22} aria-hidden />
                        </button>
                        <SearchBox />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <PlanBadge />
                        <Link
                            href="/dashboard/jobs?new=1"
                            aria-label="Quick add job"
                            className="gw-btn gw-btn-primary gw-btn-icon"
                        >
                            <PlusIcon size={20} aria-hidden />
                        </Link>
                        <ThemeToggle className={toggleClass} />
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </header>
                <main id="main" className="flex-1">{children}</main>
            </div>
        </div>
    );
}
