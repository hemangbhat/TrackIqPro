"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * The theme-color metas follow the OS scheme. When someone picks Light or Dark
 * in the app instead, point every theme-color meta at the paper of the chosen
 * theme, so the phone's status bar and browser chrome match the page.
 */
export function ThemeColorSync() {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (!resolvedTheme) return;
        const paper = getComputedStyle(document.body).getPropertyValue("--paper").trim();
        if (!paper) return;
        document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", paper));
    }, [resolvedTheme]);

    return null;
}
