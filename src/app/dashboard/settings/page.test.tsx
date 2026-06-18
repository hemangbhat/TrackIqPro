/**
 * Unit tests for the Settings page (Task 17.2).
 *
 * Covers:
 *   - Section order: profile, appearance, billing, data, privacy, danger-zone (Req 13.1)
 *   - Theme persistence: Dark/Light buttons call setTheme; exactly one aria-pressed="true" (Req 13.3)
 *   - Billing-portal 5 s timeout: error toast appears, user stays on settings (Req 13.6)
 *   - Data-export gating for free users: no export button, upgrade prompt shown;
 *     pro user sees "Export my data" button (Req 13.7)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { act, fireEvent } from "@testing-library/react";
import { renderWithTheme, screen, waitFor, within } from "../../../../test/render";
import { ToastProvider } from "../../../../components/ui/Toast";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any dynamic imports of the SUT.
// ---------------------------------------------------------------------------

// Clerk
vi.mock("@clerk/nextjs", () => ({
    useUser: vi.fn(() => ({
        user: { fullName: "Jane Doe", primaryEmailAddress: { emailAddress: "jane@example.com" } },
        isLoaded: true,
    })),
    useClerk: vi.fn(() => ({ signOut: vi.fn() })),
}));

// next-themes
const setThemeMock = vi.fn();
vi.mock("next-themes", () => ({
    useTheme: vi.fn(() => ({
        resolvedTheme: "light",
        setTheme: setThemeMock,
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// useUserPlan
const useUserPlanMock = vi.fn(() => ({
    plan: "pro" as const,
    customerId: "cus_123",
    status: "active",
    trialEnd: null,
    isPro: true,
    loading: false,
}));
vi.mock("../../../../components/useUserPlan", () => ({
    useUserPlan: () => useUserPlanMock(),
}));

// next/navigation
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
    usePathname: () => "/dashboard/settings",
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks are registered.
// ---------------------------------------------------------------------------
import SettingsPage from "./page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSettings() {
    return renderWithTheme(
        <ToastProvider>
            <SettingsPage />
        </ToastProvider>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Settings page — section order (Req 13.1)", () => {
    it("renders the six sections in the required order", () => {
        renderSettings();

        // Collect all <section> elements in DOM order.
        const sections = document.querySelectorAll("section[aria-labelledby]");
        const ids = Array.from(sections).map((s) => s.id);

        expect(ids).toEqual([
            "profile",
            "appearance",
            "billing",
            "data",
            "privacy",
            "danger-zone",
        ]);
    });

    it("each section heading is visible in the document", () => {
        renderSettings();

        expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /appearance/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /billing/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /data/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /privacy/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /danger zone/i })).toBeInTheDocument();
    });
});

describe("Settings page — theme persistence (Req 13.3)", () => {
    beforeEach(() => {
        setThemeMock.mockClear();
    });

    it("clicking the Dark button calls setTheme('dark')", async () => {
        const user = userEvent.setup();
        renderSettings();

        await user.click(screen.getByRole("button", { name: /dark/i }));

        expect(setThemeMock).toHaveBeenCalledOnce();
        expect(setThemeMock).toHaveBeenCalledWith("dark");
    });

    it("clicking the Light button calls setTheme('light')", async () => {
        const user = userEvent.setup();
        renderSettings();

        await user.click(screen.getByRole("button", { name: /light/i }));

        expect(setThemeMock).toHaveBeenCalledOnce();
        expect(setThemeMock).toHaveBeenCalledWith("light");
    });

    it("exactly one theme option has aria-pressed='true' at initial render", () => {
        renderSettings();

        const themeGroup = screen.getByRole("group", { name: /theme/i });
        const buttons = Array.from(themeGroup.querySelectorAll("button"));

        const pressedButtons = buttons.filter(
            (b) => b.getAttribute("aria-pressed") === "true"
        );
        expect(pressedButtons).toHaveLength(1);
    });

    it("exactly one theme option has aria-pressed='true' when resolvedTheme is dark", async () => {
        // Override useTheme to return dark for this test.
        const { useTheme } = await import("next-themes");
        (useTheme as ReturnType<typeof vi.fn>).mockReturnValue({
            resolvedTheme: "dark",
            setTheme: setThemeMock,
        });

        renderSettings();

        const themeGroup = screen.getByRole("group", { name: /theme/i });
        const buttons = Array.from(themeGroup.querySelectorAll("button"));

        const pressedButtons = buttons.filter(
            (b) => b.getAttribute("aria-pressed") === "true"
        );
        expect(pressedButtons).toHaveLength(1);

        // Restore default mock for subsequent tests.
        (useTheme as ReturnType<typeof vi.fn>).mockReturnValue({
            resolvedTheme: "light",
            setTheme: setThemeMock,
        });
    });
});

describe("Settings page — billing-portal timeout error (Req 13.6)", () => {
    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("shows an error toast after 5 s when the portal request hangs, and the user stays on settings", async () => {
        // Switch to fake timers BEFORE rendering so that all setTimeout calls
        // (including the 5 s billing timeout) are captured by the fake clock.
        vi.useFakeTimers();

        // Mock fetch to never resolve (simulates a permanently hanging request).
        vi.spyOn(globalThis, "fetch").mockImplementation(
            () => new Promise(() => {/* intentionally never resolves */})
        );

        renderSettings();

        const manageBillingBtn = screen.getByRole("button", { name: /manage billing/i });

        // Fire the click so handleManageBilling starts and schedules the 5 s timeout.
        act(() => {
            fireEvent.click(manageBillingBtn);
        });

        // Advance the fake clock by 6 s (past the 5 s billing timeout).
        // The async act flushes the microtask queue after the timer fires,
        // allowing the Promise.race rejection to propagate through the async
        // catch block and trigger the toast state update.
        await act(async () => {
            vi.advanceTimersByTime(6000);
        });

        // Toast fires at ~5 s; auto-dismiss is at 5+4=9 s (both fake timers).
        // We advanced only 6 s, so the toast is still rendered.
        expect(
            screen.getByText(/billing portal is unavailable/i)
        ).toBeInTheDocument();

        // The user is still on settings — page heading still rendered.
        expect(screen.getByRole("heading", { name: /^settings$/i })).toBeInTheDocument();

        // No router navigation occurred.
        expect(pushMock).not.toHaveBeenCalled();
    });
});

describe("Settings page — data-export gating for free users (Req 13.7)", () => {
    it("does NOT show export button and shows an upgrade prompt when the user is on the free plan", () => {
        useUserPlanMock.mockReturnValue({
            plan: "free",
            customerId: null,
            status: "active",
            trialEnd: null,
            isPro: false,
            loading: false,
        });

        renderSettings();

        // Export button must not be present.
        expect(
            screen.queryByRole("button", { name: /export my data/i })
        ).toBeNull();

        // An upgrade prompt description must be visible in the data section.
        // The UpgradePrompt renders the message text as a <p> inside the data section.
        const dataSection = document.getElementById("data")!;
        expect(dataSection).toBeTruthy();
        expect(
            within(dataSection).getByText(/exporting your data is a pro feature/i)
        ).toBeInTheDocument();
    });

    it("shows the 'Export my data' button when the user is on the Pro plan", () => {
        useUserPlanMock.mockReturnValue({
            plan: "pro",
            customerId: "cus_123",
            status: "active",
            trialEnd: null,
            isPro: true,
            loading: false,
        });

        renderSettings();

        expect(
            screen.getByRole("button", { name: /export my data/i })
        ).toBeInTheDocument();

        // No upgrade prompt shown for Pro users inside the data section.
        const dataSection = document.getElementById("data")!;
        expect(
            within(dataSection).queryByText(/exporting your data is a pro feature/i)
        ).toBeNull();
    });
});
