"use client";
// components/ui/DataView.tsx
//
// Presentation-only wrapper that renders exactly one of the four View_States
// (loading / empty / error / ready) for any Data_View, driven by the pure
// `resolveViewState` resolver. It wires the shared primitives:
//   - loading -> a caller-supplied, layout-matching Skeleton tree
//   - empty   -> a single EmptyState (one icon + one copy block + one CTA)
//   - error   -> ErrorState with a load-failure message and a single retry
//                control bound to the hook's fetch* function
//   - ready   -> the caller's content rendering the returned items
//
// This component owns no data and performs no fetching; it consumes the
// `{ loading, error, data, onRetry }` surface of a Data_Hook and presents it.
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

import React from "react";
import { EmptyState, ErrorState } from "./primitives";
import { resolveViewState, type ViewState } from "../../lib/view-state";

/** Config for the empty View_State: exactly one icon, one copy block, one CTA. */
export interface DataViewEmpty {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    /** The single primary call-to-action control. */
    action?: React.ReactNode;
}

export interface DataViewProps<T> {
    /** Data_Hook loading flag. */
    loading: boolean;
    /** Data_Hook error message (null/empty when there is no error). */
    error?: string | null;
    /** Items returned by the Data_Hook. */
    data?: T[] | null;
    /**
     * The hook's fetch* function. Bound to the error state's single retry
     * control; invoking it re-runs the fetch which flips `loading` true and
     * transitions the view to the loading state (Requirement 3.4).
     */
    onRetry: () => void;

    /** Layout-matching skeleton shown while loading (Requirement 3.1). */
    skeleton: React.ReactNode;

    /** Empty-state config: one icon, one copy block, one CTA (Requirement 3.2). */
    empty: DataViewEmpty;

    /** Ready-state content. May be a node or a render function over the items. */
    children: React.ReactNode | ((items: T[]) => React.ReactNode);

    /** Optional override for the error-state heading. */
    errorTitle?: string;
    /**
     * Optional override for the error-state body. Defaults to the hook's error
     * message, falling back to a generic "could not be loaded" message.
     */
    errorDescription?: string;
}

/**
 * Render exactly one View_State for a Data_View. The state is derived purely
 * from `{ loading, error, data }` so only one branch can ever render at a time
 * (Requirement 3.6).
 */
export function DataView<T>({
    loading,
    error,
    data,
    onRetry,
    skeleton,
    empty,
    children,
    errorTitle = "Couldn't load your data",
    errorDescription,
}: DataViewProps<T>) {
    const state: ViewState = resolveViewState<T>({ loading, error, data });

    if (state === "loading") {
        return <>{skeleton}</>;
    }

    if (state === "error") {
        return (
            <ErrorState
                title={errorTitle}
                description={
                    errorDescription ||
                    error ||
                    "We couldn't load this data. Please try again."
                }
                onRetry={onRetry}
            />
        );
    }

    if (state === "empty") {
        return (
            <EmptyState
                icon={empty.icon}
                title={empty.title}
                description={empty.description}
                action={empty.action}
            />
        );
    }

    // ready: one or more items
    const items = Array.isArray(data) ? data : [];
    return <>{typeof children === "function" ? children(items) : children}</>;
}

export default DataView;
