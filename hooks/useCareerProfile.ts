"use client";
import { useCallback, useEffect, useState } from "react";
import type { CareerProfile, Seniority } from "../lib/career-fit";

export interface CareerProfileData extends CareerProfile {
    seniority?: Seniority;
}

const EMPTY: CareerProfileData = { skills: [], targetRole: "", seniority: "mid" };

/**
 * Client hook for the authenticated user's career profile (skills / target role
 * / seniority). Mirrors the established hook shape: { data, loading, error,
 * refetch, save }. Identity is server-derived; this never sends a userId.
 */
export function useCareerProfile() {
    const [profile, setProfile] = useState<CareerProfileData>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/career-profile");
            if (!res.ok) throw new Error("Failed to load career profile");
            const data = await res.json();
            setProfile({
                skills: Array.isArray(data.skills) ? data.skills : [],
                targetRole: data.targetRole ?? "",
                seniority: data.seniority ?? "mid",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load career profile");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const saveProfile = useCallback(
        async (input: CareerProfileData): Promise<CareerProfileData> => {
            const res = await fetch("/api/career-profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save career profile");
            const next: CareerProfileData = {
                skills: Array.isArray(data.skills) ? data.skills : [],
                targetRole: data.targetRole ?? "",
                seniority: data.seniority ?? "mid",
            };
            setProfile(next);
            return next;
        },
        []
    );

    return { profile, loading, error, fetchProfile, saveProfile };
}
