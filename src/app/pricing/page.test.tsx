import React from "react";
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, waitFor } from "../../../test/render";
import { ToastProvider } from "../../../components/ui/Toast";

/**
 * Integration tests for the Pricing page Stripe CTA flows (Task 16.2).
 *
 * Covers:
 *   - A Free user upgrading calls fetch('/api/stripe/checkout') and, on success,
 *     hands off to Stripe by setting window.location (Req 12.2).
 *   - A failed request (rejection, non-OK, or the 30s AbortError timeout)
 *     surfaces an error toast, applies no plan change, and presents a retry CTA
 *     (Req 12.6).
 *   - When plan data is unavailable (useUserPlan still loading) the table shows
 *     both CTAs and no current-plan indicator (Req 12.7).
 *
 * The page owns the Stripe fetch flow (30s timeout via AbortController),
 * useUserPlan, useToast, and @clerk/nextjs useUser. We mock Clerk, useUserPlan,
 * next/navigation, and global fetch, and wrap the page in ToastProvider so the
 * toast paths run end-to-end.
 */

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

// Clerk's useUser: controllable per test via mutable state.
const clerkState: { isSignedIn: boolean } = { isSignedIn: true };
vi.mock("@clerk/nextjs", () => ({
    useUser: () => ({ isSignedIn: clerkState.isSignedIn, isLoaded: true }),
}));

// useUserPlan: controllable per test.
const planState: { plan: "free" | "pro" | null; loading: boolean } = {
    plan: "free",
    loading: false,
};
vi.mock("../../../components/useUserPlan", () => ({
    useUserPlan: () => ({
        plan: planState.plan,
        loading: planState.loading,
        isPro: planState.plan === "pro",
        customerId: null,
        status: null,
        trialEnd: null,
    }),
}));

import PricingPage from "./page";

const fetchMock = vi.fn();

// jsdom does not allow assigning window.location.href; replace it with a plain
// writable object so the Stripe hand-off is observable.
const originalLocation = window.location;

beforeEach(() => {
    pushMock.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    clerkState.isSignedIn = true;
    planState.plan = "free";
    planState.loading = false;

    delete (window as { location?: Location }).location;
    (window as unknown as { location: { href: string } }).location = { href: "" };
});

afterEach(() => {
    vi.unstubAllGlobals();
    (window as unknown as { location: Location }).location = originalLocation;
});

function renderPage() {
    return renderWithTheme(
        <ToastProvider>
            <PricingPage />
        </ToastProvider>
    );
}

const locationHref = () =>
    (window as unknown as { location: { href: string } }).location.href;

describe("PricingPage Stripe CTA flows", () => {
    it("calls the checkout endpoint and hands off to Stripe on a successful upgrade (Req 12.2)", async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://stripe.test/checkout-session" }),
        });

        renderPage();

        await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                "/api/stripe/checkout",
                expect.objectContaining({ method: "POST" })
            )
        );
        await waitFor(() =>
            expect(locationHref()).toBe("https://stripe.test/checkout-session")
        );
    });

    it("shows an error toast and a retry CTA with no plan change when the request rejects (Req 12.6)", async () => {
        const user = userEvent.setup();
        fetchMock.mockRejectedValue(new Error("network down"));

        renderPage();

        await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

        // Error toast surfaces the failure.
        expect(
            await screen.findByText(/could not start checkout/i)
        ).toBeInTheDocument();
        // No plan change / no Stripe hand-off occurred.
        expect(locationHref()).toBe("");
        // A retry CTA is presented.
        expect(
            await screen.findByRole("button", { name: /retry upgrade/i })
        ).toBeInTheDocument();
    });

    it("treats a non-OK response as a failure and presents retry (Req 12.6)", async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Stripe unavailable" }),
        });

        renderPage();

        await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

        expect(
            await screen.findByRole("button", { name: /retry upgrade/i })
        ).toBeInTheDocument();
        expect(locationHref()).toBe("");
    });

    it("treats a 30s timeout AbortError as a failure with retry (Req 12.6)", async () => {
        const user = userEvent.setup();
        // Simulate the AbortController firing: fetch rejects with an AbortError
        // rather than driving real timers.
        const abortError = new DOMException("Aborted", "AbortError");
        fetchMock.mockRejectedValue(abortError);

        renderPage();

        await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

        expect(
            await screen.findByText(/could not start checkout/i)
        ).toBeInTheDocument();
        expect(
            await screen.findByRole("button", { name: /retry upgrade/i })
        ).toBeInTheDocument();
        expect(locationHref()).toBe("");
    });

    it("opens the billing portal for a Pro user on a successful manage-billing request (Req 12.2/12.3)", async () => {
        const user = userEvent.setup();
        planState.plan = "pro";
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://stripe.test/portal-session" }),
        });

        renderPage();

        await user.click(screen.getByRole("button", { name: /manage billing/i }));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                "/api/stripe/portal",
                expect.objectContaining({ method: "POST" })
            )
        );
        await waitFor(() =>
            expect(locationHref()).toBe("https://stripe.test/portal-session")
        );
    });

    it("shows both CTAs and no current-plan indicator while plan data is unavailable (Req 12.7)", () => {
        planState.plan = null;
        planState.loading = true;

        renderPage();

        expect(
            screen.getByRole("button", { name: /upgrade to pro/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /manage billing/i })
        ).toBeInTheDocument();
        expect(screen.queryByText("Current plan")).not.toBeInTheDocument();
    });
});
