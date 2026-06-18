"use client";
import React, { useEffect, useState } from "react";
import { Drawer } from "./ui/Drawer";
import { Button, Field, Input, Select } from "./ui/primitives";
import { OfferInput } from "../hooks/useOffers";
import { Offer } from "../types";

const emptyForm = {
    company: "",
    title: "",
    salaryBase: "",
    bonus: "",
    equity: "",
    signingBonus: "",
    growthScore: "7",
    brandScore: "7",
};

type FormState = typeof emptyForm;

function toFormState(initial?: Partial<Offer>): FormState {
    if (!initial) return emptyForm;
    return {
        company: initial.company ?? "",
        title: initial.title ?? "",
        salaryBase: initial.salaryBase != null ? String(initial.salaryBase) : "",
        bonus: initial.bonus != null ? String(initial.bonus) : "",
        equity: initial.equity != null ? String(initial.equity) : "",
        signingBonus: initial.signingBonus != null ? String(initial.signingBonus) : "",
        growthScore: String(initial.growthScore ?? 7),
        brandScore: String(initial.brandScore ?? 7),
    };
}

interface OfferFormDrawerProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: Partial<Offer>;
    submitting?: boolean;
    onClose: () => void;
    onSubmit: (input: OfferInput) => Promise<void> | void;
}

/**
 * OfferFormDrawer wraps the shared Drawer primitive to capture an offer's inputs.
 * It carries no scoring logic; it only collects values and forwards them to the
 * caller's onSubmit (which is wired to the useOffers mutations).
 */
export function OfferFormDrawer({
    open,
    mode,
    initial,
    submitting = false,
    onClose,
    onSubmit,
}: OfferFormDrawerProps) {
    const [form, setForm] = useState<FormState>(() => toFormState(initial));

    // Re-seed the form whenever the drawer is (re)opened for a given offer.
    useEffect(() => {
        if (open) setForm(toFormState(initial));
    }, [open, initial]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload: OfferInput = {
            company: form.company,
            title: form.title,
            salaryBase: Number(form.salaryBase) || 0,
            bonus: Number(form.bonus) || 0,
            equity: Number(form.equity) || 0,
            signingBonus: Number(form.signingBonus) || 0,
            growthScore: Number(form.growthScore) || 0,
            brandScore: Number(form.brandScore) || 0,
        };
        await onSubmit(payload);
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={mode === "edit" ? "Edit offer" : "Add offer"}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="offer-form" loading={submitting}>
                        {mode === "edit" ? "Save changes" : "Add offer"}
                    </Button>
                </>
            }
        >
            <form id="offer-form" onSubmit={handleSubmit} className="space-y-6">
                <fieldset className="space-y-4">
                    <legend className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Role
                    </legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Company" htmlFor="offer-company">
                            <Input
                                id="offer-company"
                                required
                                value={form.company}
                                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                            />
                        </Field>
                        <Field label="Title" htmlFor="offer-title">
                            <Input
                                id="offer-title"
                                required
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            />
                        </Field>
                    </div>
                </fieldset>
                <fieldset className="space-y-4">
                    <legend className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Compensation
                    </legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Base salary (USD)" htmlFor="offer-base">
                        <Input
                            id="offer-base"
                            type="number"
                            min={0}
                            required
                            value={form.salaryBase}
                            onChange={(e) => setForm((f) => ({ ...f, salaryBase: e.target.value }))}
                        />
                    </Field>
                    <Field label="Annual bonus (USD)" htmlFor="offer-bonus">
                        <Input
                            id="offer-bonus"
                            type="number"
                            min={0}
                            value={form.bonus}
                            onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Equity / year (USD)" htmlFor="offer-equity">
                        <Input
                            id="offer-equity"
                            type="number"
                            min={0}
                            value={form.equity}
                            onChange={(e) => setForm((f) => ({ ...f, equity: e.target.value }))}
                        />
                    </Field>
                    <Field label="Signing bonus (USD)" htmlFor="offer-signing">
                        <Input
                            id="offer-signing"
                            type="number"
                            min={0}
                            value={form.signingBonus}
                            onChange={(e) => setForm((f) => ({ ...f, signingBonus: e.target.value }))}
                        />
                    </Field>
                </div>
                </fieldset>
                <fieldset className="space-y-4">
                    <legend className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                        Signals
                    </legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Growth potential (0-10)" htmlFor="offer-growth">
                        <Select
                            id="offer-growth"
                            value={form.growthScore}
                            onChange={(e) => setForm((f) => ({ ...f, growthScore: e.target.value }))}
                        >
                            {Array.from({ length: 11 }).map((_, n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Company brand (0-10)" htmlFor="offer-brand">
                        <Select
                            id="offer-brand"
                            value={form.brandScore}
                            onChange={(e) => setForm((f) => ({ ...f, brandScore: e.target.value }))}
                        >
                            {Array.from({ length: 11 }).map((_, n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>
                </fieldset>
            </form>
        </Drawer>
    );
}

export default OfferFormDrawer;
