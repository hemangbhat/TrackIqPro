"use client";
import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../../lib/motion-tokens";
import { XIcon } from "./icons";

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const opener = useRef<HTMLElement | null>(null);

    // Like Drawer: move focus into the dialog on open, keep Tab inside it, close
    // on Escape, and return focus to whatever opened it.
    useEffect(() => {
        if (!open) return;
        opener.current = document.activeElement as HTMLElement | null;
        const focusables = () =>
            Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ) ?? []
            );
        // Prefer the footer's first action (e.g. Cancel) over the close icon.
        const first = focusables();
        (first.find((el) => el.closest("[data-modal-footer]")) ?? first[0] ?? dialogRef.current)?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") return onClose();
            if (e.key !== "Tab") return;
            const items = focusables();
            if (items.length === 0) return e.preventDefault();
            const firstItem = items[0];
            const lastItem = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstItem) {
                e.preventDefault();
                lastItem.focus();
            } else if (!e.shiftKey && document.activeElement === lastItem) {
                e.preventDefault();
                firstItem.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            opener.current?.focus?.();
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
                    exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
                >
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={dialogRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto border-2 border-[var(--ink)] bg-[var(--paper)]"
                        initial={{ transform: "translateY(8px) scale(0.97)" }}
                        animate={{ transform: "translateY(0px) scale(1)", transition: { duration: 0.2, ease: EASE_OUT } }}
                        exit={{ transform: "translateY(8px) scale(0.97)", transition: { duration: 0.15, ease: EASE_OUT } }}
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
                        <div className="px-6 py-5">{children}</div>
                        {footer && (
                            <div data-modal-footer className="flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
