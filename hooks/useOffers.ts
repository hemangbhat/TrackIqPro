"use client";
import { useCallback, useEffect, useState } from "react";
import { Offer } from "../types";

export type OfferInput = Partial<Omit<Offer, "_id" | "userId" | "offerId">>;

export function useOffers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/offers");
            if (!res.ok) throw new Error("Failed to load offers");
            const data = await res.json();
            setOffers(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load offers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const createOffer = useCallback(async (input: OfferInput): Promise<Offer> => {
        const res = await fetch("/api/offers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create offer");
        setOffers((prev) => [data, ...prev]);
        return data;
    }, []);

    const updateOffer = useCallback(
        async (id: string, input: OfferInput): Promise<Offer> => {
            const res = await fetch(`/api/offers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update offer");
            setOffers((prev) => prev.map((o) => (o._id === id ? data : o)));
            return data;
        },
        []
    );

    const deleteOffer = useCallback(async (id: string) => {
        const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to delete offer");
        }
        setOffers((prev) => prev.filter((o) => o._id !== id));
    }, []);

    return {
        offers,
        loading,
        error,
        fetchOffers,
        createOffer,
        updateOffer,
        deleteOffer,
    };
}
