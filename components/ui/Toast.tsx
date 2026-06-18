"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon, XIcon } from "./icons";

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
            setToasts((t) => [...t, { id, type, message }]);
            setTimeout(() => remove(id), 4000);
        },
        [remove]
    );

    const value: ToastContextValue = {
        toast,
        success: (m) => toast(m, "success"),
        error: (m) => toast(m, "error"),
    };

    const tone: Record<ToastType, string> = {
        success: "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
        error: "border-rose-500/40 text-rose-600 dark:text-rose-300",
        info: "border-indigo-500/40 text-indigo-600 dark:text-indigo-300",
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
                role="region"
                aria-live="polite"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-[var(--surface)] px-4 py-3 shadow-lg ${tone[t.type]} animate-[fadeIn_0.2s_ease-out]`}
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
                            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
