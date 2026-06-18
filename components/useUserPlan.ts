"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export type PlanData = {
    plan: "free" | "pro";
    customerId: string | null;
    status: string | null;
    trialEnd: string | null;
};

export function useUserPlan() {
    const { user, isLoaded } = useUser();
    const [data, setData] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;
        if (!user) {
            setLoading(false);
            return;
        }
        let active = true;
        fetch("/api/user/plan")
            .then((res) => res.json())
            .then((d) => {
                if (active) setData(d);
            })
            .catch(() => {
                if (active) setData({ plan: "free", customerId: null, status: "active", trialEnd: null });
            })
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [user, isLoaded]);

    return {
        plan: data?.plan ?? null,
        customerId: data?.customerId ?? null,
        status: data?.status ?? null,
        trialEnd: data?.trialEnd ?? null,
        isPro: data?.plan === "pro",
        loading,
    };
}
