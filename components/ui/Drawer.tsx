"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_DRAWER, EASE_OUT } from "../../lib/motion-tokens";
import { XIcon } from "./icons";

type DrawerSide = "left" | "right";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Drawer is a side-sheet variant of Modal. It shares the same accessibility
 * contract (role="dialog", aria-modal, focus trap, Escape-to-close) while
 * sliding in from the left or right edge.
 *
 * Behavior:
 * - Confines keyboard focus to the panel (Tab / Shift+Tab cycle within).
 * - Closes on Escape and restores focus to the element that opened it.
 * - Locks body scroll while open.
 */
export function Drawer({
    open,
    onClose,
    title,
    children,
    footer,
    side = "right",
    width = "max-w-md",
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    side?: DrawerSide;
    width?: string;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    // Remember the trigger element so focus can be restored on close.
    useEffect(() => {
        if (open) {
            previouslyFocused.current = document.activeElement as HTMLElement | null;
        }
    }, [open]);

    // Lock body scroll while the drawer is open.
    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    const getFocusable = useCallback(() => {
        const root = panelRef.current;
        if (!root) return [] as HTMLElement[];
        return Array.from(
            root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    }, []);

    // Move focus into the panel when it opens.
    useEffect(() => {
        if (!open) return;
        const focusables = getFocusable();
        const target = focusables[0] ?? panelRef.current;
        target?.focus();
    }, [open, getFocusable]);

    // Restore focus to the triggering element on close.
    useEffect(() => {
        if (open) return;
        const trigger = previouslyFocused.current;
        if (trigger && typeof trigger.focus === "function") {
            trigger.focus();
        }
    }, [open]);

    // Escape-to-close and focus trap (Tab / Shift+Tab cycle).
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== "Tab") return;

            const focusables = getFocusable();
            if (focusables.length === 0) {
                e.preventDefault();
                panelRef.current?.focus();
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (active === first || !panelRef.current?.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last || !panelRef.current?.contains(active)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, [open, onClose, getFocusable]);

    const offscreen = side === "right" ? "100%" : "-100%";
    const sidePosition = side === "right" ? "right-0" : "left-0";

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
                    exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
                >
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        tabIndex={-1}
                        className={`absolute top-0 ${sidePosition} z-10 flex h-full w-full ${width} flex-col border-[var(--ink)] bg-[var(--paper)] outline-none ${side === "left" ? "border-r-2" : "border-l-2"}`}
                        initial={{ transform: `translateX(${offscreen})` }}
                        animate={{ transform: "translateX(0%)", transition: { duration: 0.3, ease: EASE_DRAWER } }}
                        exit={{ transform: `translateX(${offscreen})`, transition: { duration: 0.2, ease: EASE_OUT } }}
                    >
                        <div className="flex items-center justify-between border-b-2 border-[var(--ink)] px-6 py-4">
                            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-[var(--ink)]">{title}</h2>
                            <button
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">{children}</div>
                        {footer && (
                            <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
