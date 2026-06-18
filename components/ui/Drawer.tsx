"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        tabIndex={-1}
                        className={`surface absolute top-0 ${sidePosition} z-10 flex h-full w-full ${width} flex-col shadow-2xl outline-none`}
                        initial={{ x: offscreen }}
                        animate={{ x: 0 }}
                        exit={{ x: offscreen }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                            <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
                            <button
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
                        {footer && (
                            <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
