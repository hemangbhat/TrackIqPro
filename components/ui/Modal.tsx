"use client";
import React, { useEffect } from "react";
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
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        if (open) document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
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
