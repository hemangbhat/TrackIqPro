"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, XIcon } from "./icons";
import { EASE_OUT } from "../../lib/motion-tokens";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

type ToastContextValue = {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const remove = useCallback((id: number) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    const toast = useCallback(
        (message: string, type: ToastType = "info") => {
            const id = ++counter;
            // Keep at most three on screen; errors stay long enough to read.
            setToasts((t) => [...t.slice(-2), { id, type, message }]);
            setTimeout(() => remove(id), type === "error" ? 7000 : 4000);
        },
        [remove]
    );

    // Stable identity, so effects that depend on the toast API run once.
    const value = useMemo<ToastContextValue>(
        () => ({
            toast,
            success: (m) => toast(m, "success"),
            error: (m) => toast(m, "error"),
        }),
        [toast]
    );

    // The grid world: a flat paper slip with a heavy ink rule on the left in
    // the message's tone.
    const tone: Record<ToastType, string> = {
        success: "border-l-emerald-600 text-emerald-700 dark:text-emerald-400",
        error: "border-l-rose-600 text-rose-700 dark:text-rose-400",
        info: "border-l-[var(--ultra)] text-[var(--ultra-text)]",
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
                role="region"
                aria-live="polite"
            >
                <AnimatePresence initial={false}>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, transform: "translateY(100%)" }}
                        animate={{ opacity: 1, transform: "translateY(0%)", transition: { duration: 0.3, ease: EASE_OUT } }}
                        exit={{ opacity: 0, transform: "translateY(100%)", transition: { duration: 0.2, ease: EASE_OUT } }}
                        role={t.type === "error" ? "alert" : undefined}
                        className={`pointer-events-auto flex items-start gap-3 border-2 border-l-[6px] border-[var(--ink)] bg-[var(--paper)] px-4 py-3 ${tone[t.type]}`}
                    >
                        <span className="mt-0.5 shrink-0">
                            {t.type === "error" ? <XIcon size={18} /> : <CheckIcon size={18} />}
                        </span>
                        <p className="flex-1 text-sm font-medium text-[var(--text)]">
                            {t.message}
                        </p>
                        <button
                            onClick={() => remove(t.id)}
                            aria-label="Dismiss notification"
                            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--ultra-text)]"
                        >
                            <XIcon size={16} />
                        </button>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
