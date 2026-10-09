"use client";
import React from "react";

function cx(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

/* ----------------------------- Button ----------------------------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse";
    size?: "sm" | "md";
    loading?: boolean;
};

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const variants: Record<string, string> = {
        primary:
            "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500 shadow-sm",
        secondary:
            "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]/40 focus-visible:ring-indigo-500",
        ghost:
            "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] focus-visible:ring-indigo-500",
        danger:
            "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500 shadow-sm",
        // For use on saturated brand backgrounds (e.g. the indigo CTA band).
        inverse:
            "bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:ring-white shadow-sm",
    };
    // Touch targets are at least 44x44 CSS px (Requirement 15.9): every size
    // enforces min-h-11 (44px) so controls remain comfortably tappable.
    const sizes: Record<string, string> = {
        sm: "min-h-11 px-3 py-1.5 text-sm",
        md: "min-h-11 px-4 py-2 text-sm",
    };
    return (
        <button
            disabled={disabled || loading}
            className={cx(
                "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 cursor-pointer",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading && <Spinner size={16} />}
            {children}
        </button>
    );
}

/* ----------------------------- Card ------------------------------- */
export function Card({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cx("surface rounded-2xl shadow-sm", className)}>{children}</div>
    );
}

/* ----------------------------- Badge ------------------------------ */
const badgeTones: Record<string, string> = {
    applied: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    screening: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    interview: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    offer: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    withdrawn: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    neutral: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    pro: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
};

export function Badge({
    tone = "neutral",
    children,
    className,
}: {
    tone?: keyof typeof badgeTones | string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cx(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                badgeTones[tone] || badgeTones.neutral,
                className
            )}
        >
            {children}
        </span>
    );
}

/* --------------------------- Form fields -------------------------- */
// min-h-11 keeps inputs at the 44px minimum touch target (Requirement 15.9).
const fieldBase =
    "w-full min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/70 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

export function Label({
    htmlFor,
    children,
}: {
    htmlFor?: string;
    children: React.ReactNode;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="mb-1.5 block text-sm font-medium text-[var(--text)]"
        >
            {children}
        </label>
    );
}

export const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(fieldBase, className)} {...props} />;
});

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
    return (
        <textarea ref={ref} className={cx(fieldBase, "min-h-24", className)} {...props} />
    );
});

export const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
    return (
        <select ref={ref} className={cx(fieldBase, "cursor-pointer", className)} {...props}>
            {children}
        </select>
    );
});

export function Field({
    label,
    htmlFor,
    children,
    hint,
    error,
}: {
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
    hint?: string;
    error?: string;
}) {
    const reactId = React.useId();
    const hintId = hint ? `${reactId}-hint` : undefined;
    const errorId = error ? `${reactId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    // Programmatically associate hint/error text with the input via aria-describedby
    const child =
        describedBy && React.isValidElement(children)
            ? React.cloneElement(
                  children as React.ReactElement<{
                      "aria-describedby"?: string;
                      "aria-invalid"?: boolean;
                  }>,
                  {
                      "aria-describedby": describedBy,
                      ...(error ? { "aria-invalid": true } : {}),
                  }
              )
            : children;

    return (
        <div>
            <Label htmlFor={htmlFor}>{label}</Label>
            {child}
            {hint && (
                <p id={hintId} className="mt-1 text-xs text-[var(--text-muted)]">
                    {hint}
                </p>
            )}
            {error && (
                <p
                    id={errorId}
                    className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

/* ---------------------------- Spinner ----------------------------- */
export function Spinner({ size = 20 }: { size?: number }) {
    return (
        <svg
            className="animate-spin"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="4"
            />
            <path
                d="M22 12a10 10 0 0 0-10-10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* ---------------------------- Skeleton ---------------------------- */
export function Skeleton({ className }: { className?: string }) {
    return <div className={cx("skeleton rounded-lg", className)} />;
}

/* --------------------------- EmptyState --------------------------- */
export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
            {icon && (
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-indigo-500">
                    {icon}
                </div>
            )}
            <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

/* --------------------------- ErrorState --------------------------- */
export function ErrorState({
    title = "Something went wrong",
    description,
    onRetry,
}: {
    title?: string;
    description?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    <path d="M12 9v4M12 17h.01" />
                </svg>
            </div>
            <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
            {description && (
                <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
            )}
            {onRetry && (
                <div className="mt-5">
                    <Button variant="secondary" onClick={onRetry}>
                        Try again
                    </Button>
                </div>
            )}
        </div>
    );
}
