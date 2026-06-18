import React from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, within } from "../test/render";
import PricingTable, { type PricingTableProps } from "./PricingTable";

/**
 * Unit tests for the presentation-only PricingTable (Task 16.2).
 *
 * Covers:
 *   - Persistent "Recommended" highlight on the Pro column (Req 12.1).
 *   - Current-plan indicator shown for free / pro and omitted when the plan is
 *     unavailable, in which case BOTH CTAs are present (Req 12.4, 12.7).
 *   - The pending state disables the initiating CTA and shows a loading label
 *     (Req 12.5).
 *   - The failed state surfaces a retry label on the affected CTA (Req 12.6).
 *
 * All async work lives in the page; here we only assert the component reflects
 * the props it is given.
 */

function renderTable(props: Partial<PricingTableProps> = {}) {
    const onUpgrade = props.onUpgrade ?? vi.fn();
    const onManageBilling = props.onManageBilling ?? vi.fn();
    const result = renderWithTheme(
        <PricingTable
            onUpgrade={onUpgrade}
            onManageBilling={onManageBilling}
            {...props}
        />
    );
    return { ...result, onUpgrade, onManageBilling };
}

const upgradeCta = (name: RegExp = /upgrade to pro|starting checkout|retry upgrade/i) =>
    screen.getByRole("button", { name });
const manageCta = (name: RegExp = /manage billing|opening billing|retry billing/i) =>
    screen.getByRole("button", { name });

describe("PricingTable", () => {
    describe("recommended highlight (Req 12.1)", () => {
        it("renders a persistent Recommended indicator on the Pro column for every plan state", () => {
            for (const currentPlan of [undefined, "free", "pro"] as const) {
                const { unmount } = renderTable({ currentPlan });
                expect(screen.getByText("Recommended")).toBeInTheDocument();
                // The Pro column header carries the highlight.
                const proHeader = screen.getByRole("columnheader", { name: /pro/i });
                expect(within(proHeader).getByText("Recommended")).toBeInTheDocument();
                unmount();
            }
        });
    });

    describe("current-plan indication (Req 12.4, 12.7)", () => {
        it("marks Free as the current plan and shows only the upgrade CTA", () => {
            renderTable({ currentPlan: "free" });

            const freeHeader = screen.getByRole("columnheader", { name: /free/i });
            expect(within(freeHeader).getByText("Current plan")).toBeInTheDocument();

            expect(upgradeCta(/upgrade to pro/i)).toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: /manage billing/i })
            ).not.toBeInTheDocument();
        });

        it("marks Pro as the current plan and shows only the manage-billing CTA", () => {
            renderTable({ currentPlan: "pro" });

            const proHeader = screen.getByRole("columnheader", { name: /pro/i });
            expect(within(proHeader).getByText("Current plan")).toBeInTheDocument();

            expect(manageCta(/manage billing/i)).toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: /upgrade to pro/i })
            ).not.toBeInTheDocument();
        });

        it("omits the current-plan indicator and shows BOTH CTAs when plan data is unavailable", () => {
            renderTable({ currentPlan: undefined });

            expect(screen.queryByText("Current plan")).not.toBeInTheDocument();
            expect(upgradeCta(/upgrade to pro/i)).toBeInTheDocument();
            expect(manageCta(/manage billing/i)).toBeInTheDocument();
        });
    });

    describe("loading / disabled state (Req 12.5)", () => {
        it("disables the upgrade CTA and shows a loading label while upgrade is pending", () => {
            renderTable({ currentPlan: "free", pending: "upgrade" });

            const cta = upgradeCta(/starting checkout/i);
            expect(cta).toBeDisabled();
            expect(cta).toHaveTextContent(/starting checkout/i);
        });

        it("disables the manage-billing CTA and shows a loading label while manage is pending", () => {
            renderTable({ currentPlan: "pro", pending: "manage" });

            const cta = manageCta(/opening billing/i);
            expect(cta).toBeDisabled();
            expect(cta).toHaveTextContent(/opening billing/i);
        });
    });

    describe("failure / retry state (Req 12.6)", () => {
        it("shows a retry label on the upgrade CTA after a failed upgrade", async () => {
            const user = userEvent.setup();
            const { onUpgrade } = renderTable({
                currentPlan: "free",
                failed: "upgrade",
            });

            const cta = upgradeCta(/retry upgrade/i);
            expect(cta).toBeInTheDocument();
            expect(cta).not.toBeDisabled();

            // Retry is wired to the same upgrade handler.
            await user.click(cta);
            expect(onUpgrade).toHaveBeenCalledTimes(1);
        });

        it("shows a retry label on the manage-billing CTA after a failed billing request", async () => {
            const user = userEvent.setup();
            const { onManageBilling } = renderTable({
                currentPlan: "pro",
                failed: "manage",
            });

            const cta = manageCta(/retry billing/i);
            expect(cta).toBeInTheDocument();

            await user.click(cta);
            expect(onManageBilling).toHaveBeenCalledTimes(1);
        });
    });
});
