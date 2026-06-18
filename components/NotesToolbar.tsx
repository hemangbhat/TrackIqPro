"use client";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/primitives";
import { SearchIcon, FilterIcon } from "./ui/icons";

interface NotesToolbarProps {
    /** Debounced search query owned by the parent. */
    query: string;
    /** Called ~300ms after the user pauses typing. */
    onQueryChange: (q: string) => void;
    /** Currently selected round chip value, or null when no chip is selected. */
    round: string | null;
    onRoundChange: (round: string | null) => void;
    /** Distinct round values derived from the notes data hook. */
    rounds: string[];
    /** Number of notes currently visible after search + filter. */
    resultCount: number;
}

/**
 * NotesToolbar renders the notes search input and round filter chips.
 *
 * - The search input is debounced: `onQueryChange` fires ~300ms after the
 *   user pauses typing (Requirement 11.5).
 * - Round chips filter by exact round value; selecting "All" clears the chip
 *   filter (Requirements 11.6, 11.7).
 * - Filtering itself is performed client-side by the parent over the array
 *   returned by `useNotes`.
 */
export function NotesToolbar({
    query,
    onQueryChange,
    round,
    onRoundChange,
    rounds,
    resultCount,
}: NotesToolbarProps) {
    // Local, immediate input value; debounced before lifting to the parent.
    const [value, setValue] = useState(query);
    const onQueryChangeRef = useRef(onQueryChange);
    onQueryChangeRef.current = onQueryChange;

    // Keep the local input in sync if the parent resets the query externally.
    useEffect(() => {
        setValue(query);
    }, [query]);

    // Debounce: only propagate the query after a 300ms pause in typing.
    useEffect(() => {
        if (value === query) return;
        const id = setTimeout(() => onQueryChangeRef.current(value), 300);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const chipBase =
        "inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";
    const chipActive = "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/30";
    const chipIdle =
        "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-indigo-400/40 hover:text-[var(--text)]";

    return (
        <div className="glass-panel gradient-border rounded-2xl p-4">
            <div className="space-y-4">
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        <SearchIcon size={18} />
                    </span>
                    <Input
                        type="search"
                        aria-label="Search notes"
                        placeholder="Search your notes by title or content"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="rounded-full pl-11"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)]/60 pt-3">
                    <span className="flex items-center gap-1.5 font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        <FilterIcon size={14} aria-hidden="true" />
                        Round
                    </span>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label="Filter notes by round"
                    >
                        <button
                            type="button"
                            aria-pressed={round === null}
                            onClick={() => onRoundChange(null)}
                            className={`${chipBase} ${round === null ? chipActive : chipIdle}`}
                        >
                            All
                        </button>
                        {rounds.map((r) => (
                            <button
                                key={r}
                                type="button"
                                aria-pressed={round === r}
                                onClick={() => onRoundChange(round === r ? null : r)}
                                className={`${chipBase} ${round === r ? chipActive : chipIdle}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <span
                        className="ml-auto font-mono-label text-[11px] uppercase text-[var(--text-muted)]"
                        aria-live="polite"
                    >
                        {resultCount} {resultCount === 1 ? "note" : "notes"}
                    </span>
                </div>
            </div>
        </div>
    );
}
