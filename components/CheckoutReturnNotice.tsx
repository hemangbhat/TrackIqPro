"use client";
import { useEffect } from "react";
import { useToast } from "./ui/Toast";

const MESSAGES = {
    success: "Payment received. Pro unlocks as soon as Stripe confirms it, usually within a minute.",
    cancel: "Checkout canceled. Nothing was charged and you're still on the Free plan.",
} as const;

/**
 * Stripe sends people back with `?upgrade=success` (dashboard) or
 * `?upgrade=cancel` (pricing). Say what happened once, then drop the param so
 * a refresh or a shared link doesn't repeat it. Mounted once in Providers.
 */
export function CheckoutReturnNotice() {
    const toast = useToast();

    useEffect(() => {
        const url = new URL(window.location.href);
        const outcome = url.searchParams.get("upgrade");
        if (outcome !== "success" && outcome !== "cancel") return;
        if (outcome === "success") toast.success(MESSAGES.success);
        else toast.toast(MESSAGES.cancel);
        url.searchParams.delete("upgrade");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }, [toast]);

    return null;
}
