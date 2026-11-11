"use client";
import React from "react";
import Link from "next/link";

function cx(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

/* ----------------------------- Button ----------------------------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse";
    size?: "sm" | "md";
    loading?: boolean;
};

type ButtonStyle = { variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string };

// Square, 2px, flat: the typographic grid world's controls (docs/DESIGN.md).
// Hover swaps are gated to fine pointers so a tap never leaves a sticky fill.
function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyle): string {
    const variants: Record<string, string> = {
        primary:
            "border-[var(--ultra)] bg-[var(--ultra)] text-[var(--on-ultra)] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[var(--ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[var(--paper)]",
        secondary:
            "border-[var(--ink)] bg-transparent text-[var(--ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[var(--paper)]",
        ghost:
            "border-transparent bg-transparent text-[var(--ink-muted)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--paper-2)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[var(--ink)]",
        danger:
            "border-rose-700 bg-rose-700 text-white [@media(hover:hover)_and_(pointer:fine)]:hover:border-rose-800 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-rose-800",
        // For use on the ultramarine field.
        inverse:
            "border-[var(--on-ultra)] bg-[var(--on-ultra)] text-[var(--field-ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[var(--field-ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--field-ink)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[var(--field-paper)]",
    };
    // Touch targets are at least 44x44 CSS px (Requirement 15.9): every size
    // enforces min-h-11 (44px) so controls remain comfortably tappable.
    const sizes: Record<string, string> = {
        sm: "min-h-11 px-3 py-1.5 text-sm",
        md: "min-h-11 px-4 py-2 text-[0.9375rem]",
    };
    return cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 border-2 font-bold transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--ultra-text)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
    );
}

export function Button({
    variant,
    size,
    loading = false,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={buttonClasses({ variant, size, className })}
            {...props}
        >
            {loading && <Spinner size={16} />}
            {children}
        </button>
    );
}

/**
 * A link that looks like a Button. Use this for navigation instead of
 * <Link><Button/></Link>: a button inside a link is invalid HTML, is two tab
 * stops, and screen readers announce it twice.
 */
export function ButtonLink({
    href,
    variant,
    size,
    className,
    children,
    ...props
}: ButtonStyle & Omit<React.ComponentProps<typeof Link>, "className">) {
    return (
        <Link href={href} className={buttonClasses({ variant, size, className })} {...props}>
            {children}
        </Link>
    );
}

/* ----------------------------- Card ------------------------------- */
// A ruled section, not a floating box: a 2px ink rule over the content.
export function Card({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return <div className={cx("border-t-2 border-[var(--ink)] pt-4", className)}>{children}</div>;
}

/* ----------------------------- Badge ------------------------------ */
const badgeTones: Record<string, string> = {
    applied: "bg-blue-500/15 text-blue-800 dark:text-blue-300",
    screening: "bg-amber-500/20 text-amber-900 dark:text-amber-300",
    interview: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
    offer: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-300",
    accepted: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-300",
    rejected: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
    withdrawn: "bg-[var(--paper-2)] text-[var(--ink-muted)]",
    pending: "bg-amber-500/20 text-amber-900 dark:text-amber-300",
    neutral: "bg-[var(--paper-2)] text-[var(--ink-muted)]",
    pro: "bg-[var(--ultra)] text-[var(--on-ultra)]",
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
                "inline-flex items-center px-2 py-0.5 text-xs font-bold capitalize",
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
    "w-full min-h-11 border border-[var(--ink-muted)] bg-[var(--surface)] px-3 py-2 text-[0.9375rem] text-[var(--ink)] placeholder:text-[var(--ink-muted)] transition-colors duration-150 focus:border-[var(--ultra-text)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ultra-text)] aria-[invalid=true]:border-rose-700";

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
            className="mb-1.5 block text-sm font-bold text-[var(--ink)]"
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
    return <div className={cx("skeleton", className)} />;
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
        <div className="flex flex-col items-start border-t-2 border-[var(--ink)] py-10">
            {icon && <div className="mb-4 text-[var(--ink-muted)]" aria-hidden>{icon}</div>}
            <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[var(--ink)]">{title}</h3>
            {description && (
                <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
                    {description}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
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
        <div className="flex flex-col items-start border-t-2 border-rose-700 py-10">
            <div className="mb-4 text-rose-700 dark:text-rose-400" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    <path d="M12 9v4M12 17h.01" />
                </svg>
            </div>
            <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[var(--ink)]">{title}</h3>
            {description && (
                <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">{description}</p>
            )}
            {onRetry && (
                <div className="mt-6">
                    <Button variant="secondary" onClick={onRetry}>
                        Try again
                    </Button>
                </div>
            )}
        </div>
    );
}
