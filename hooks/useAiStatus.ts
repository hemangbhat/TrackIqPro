"use client";
import { useCallback, useEffect, useState } from "react";

export type AiStatus = { configured: boolean; enabled: boolean; remaining: number };

/**
 * Loads GET /api/ai/status and exposes setEnabled (POST /api/ai/enable).
 * After a successful enable/disable the status is refetched so callers
 * always render server truth. `skip` disables all fetching (demo sample).
 */
export function useAiStatus(skip = false) {
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [loading, setLoading] = useState(!skip);
    const [enableError, setEnableError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/ai/status");
            if (!res.ok) throw new Error("status failed");
            setStatus((await res.json()) as AiStatus);
        } catch {
            // Treat a failed status call like "not configured": the feature stays hidden.
            setStatus({ configured: false, enabled: false, remaining: 0 });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!skip) void refresh();
    }, [skip, refresh]);

    /** Returns true on success; on failure sets enableError. */
    const setEnabled = useCallback(
        async (enabled: boolean): Promise<boolean> => {
            setBusy(true);
            setEnableError(null);
            try {
                const res = await fetch("/api/ai/enable", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled }),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    setEnableError(body?.error || "Something went wrong. Please try again.");
                    return false;
                }
                await refresh();
                return true;
            } catch {
                setEnableError("Something went wrong. Please try again.");
                return false;
            } finally {
                setBusy(false);
            }
        },
        [refresh]
    );

    return { status, loading, enableError, busy, refresh, setEnabled };
}
