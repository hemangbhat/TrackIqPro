"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./ui/icons";

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Until mounted, render a stable, theme-agnostic state so the server and
    // first client render match (avoids a hydration mismatch on aria-label).
    const isDark = mounted && resolvedTheme === "dark";
    const label = !mounted
        ? "Toggle theme"
        : isDark
        ? "Switch to light mode"
        : "Switch to dark mode";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={label}
            title={label}
            type="button"
            suppressHydrationWarning
        >
            {mounted && isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
    );
}
