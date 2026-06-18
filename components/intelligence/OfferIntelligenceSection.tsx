"use client";
import React from "react";
import { useOffers } from "../../hooks/useOffers";
import { Card, Skeleton, ErrorState } from "../ui/primitives";
import { OfferIntelligence } from "./OfferIntelligence";

/**
 * Client wrapper that sources offers from the `useOffers` Data_Hook and renders
 * the Offer Intelligence panel beneath the existing OfferMatrix. Owns the
 * loading and error presentation; empty / single-offer states are handled by
 * the panel itself.
 */
export function OfferIntelligenceSection() {
    const { offers, loading, error, fetchOffers } = useOffers();

    if (loading) {
        return (
            <Card className="glass-panel gradient-border p-6 sm:p-7">
                <Skeleton className="mb-4 h-6 w-64" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Skeleton className="h-72" />
                    <Skeleton className="h-72" />
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <ErrorState
                title="Couldn't load offer intelligence"
                description="We couldn't reach the server to analyze your offers. Check your connection and try again."
                onRetry={fetchOffers}
            />
        );
    }

    return <OfferIntelligence offers={offers} />;
}

export default OfferIntelligenceSection;
