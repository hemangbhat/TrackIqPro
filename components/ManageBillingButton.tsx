"use client";
import React, { useState } from "react";
import { Button } from "./ui/primitives";
import { useToast } from "./ui/Toast";
import { CreditCardIcon } from "./ui/icons";

export default function ManageBillingButton() {
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    async function handleManageBilling() {
        setLoading(true);
        try {
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Could not open billing portal");
            }
        } catch {
            toast.error("Could not open billing portal");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button variant="secondary" onClick={handleManageBilling} loading={loading}>
            <CreditCardIcon size={16} /> Manage billing
        </Button>
    );
}
