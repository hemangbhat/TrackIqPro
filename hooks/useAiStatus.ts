"use client";
import { useCallback, useEffect, useState } from "react";

export type AiStatus = { configured: boolean; enabled: boolean; remaining: number };

/**
 * Loads GET /api/ai/status and exposes setEnabled (POST /api/ai/enable).
 * After every enable/disable attempt, successful or not, the status is
 * refetched so callers always render the server's flag. `skip` disables all
 * fetching (demo sample).
 *
 * `statusError` means the status request itself failed. That is different from
 * "not configured": the prep panel stays hidden either way, but Settings shows a
 * retry so the off-switch is always reachable.
 */
export function useAiStatus(skip = false) {
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [statusError, setStatusError] = useState(false);
    const [loading, setLoading] = useState(!skip);
    const [enableError, setEnableError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/ai/status");
            if (!res.ok) throw new Error("status failed");
            setStatus((await res.json()) as AiStatus);
            setStatusError(false);
        } catch {
            setStatus(null);
            setStatusError(true);
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
            let ok = false;
            try {
                const res = await fetch("/api/ai/enable", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled }),
                });
                ok = res.ok;
                if (!ok) {
                    const body = await res.json().catch(() => ({}));
                    setEnableError(body?.error || "Something went wrong. Please try again.");
                }
            } catch {
                setEnableError("Something went wrong. Please try again.");
            }
            // Even a failed call may have changed the flag (disable clears it before
            // deleting data), so always re-read it.
            await refresh();
            setBusy(false);
            return ok;
        },
        [refresh]
    );

    return { status, statusError, loading, enableError, busy, refresh, setEnabled };
}
