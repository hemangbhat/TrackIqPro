"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./ui/icons";

const defaultClassName =
    "inline-flex h-11 w-11 cursor-pointer items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ultra-text)]";

export function ThemeToggle({ className = defaultClassName }: { className?: string }) {
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
            className={className}
            aria-label={label}
            title={label}
            type="button"
            suppressHydrationWarning
        >
            {mounted && isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
    );
}
