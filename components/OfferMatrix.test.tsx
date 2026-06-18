import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen } from "../test/render";
import { ToastProvider } from "./ui/Toast";
import { EXPORT_UPGRADE_MESSAGE } from "../lib/plan-gate";
import type { Offer } from "../types";
import type { GateDecision } from "../lib/plan-gate";

/**
 * Unit tests for the Offers surface states and export gating (Task 14.4).
 *
 * Covers:
 *   - Empty state when the user has no offers; the matrix, weight sliders, and
 *     best-offer highlight are replaced by a single empty state (Req 10.4, 10.7).
 *   - Scoring-error suppression: when the Scoring_Engine throws, scores, the
 *     best-offer highlight, and the score explanation are suppressed and a
 *     "scoring unavailable" indication is shown, while the offers and weight
 *     inputs are retained without modification (Req 10.8).
 *   - Weight sliders are constrained to the inclusive [0, 100] range (Req 10.4)
 *     — verified against WeightSliders directly.
 *   - Free-user export gating: activating export is blocked (no CSV write) and
 *     presents the Plan_Gate upgrade prompt; a Pro_User runs the export
 *     (Req 10.10).
 *
 * The Data_Hook (useOffers) and the Plan_Gate hook (usePlanGate) are mocked so
 * each View_State can be driven deterministically. lib/scoring keeps its real
 * implementation except scoreOffers, which can be made to throw to exercise the
 * scoring-error branch. xlsx.writeFile is stubbed so we can assert whether the
 * CSV export actually runs. UpgradePrompt reads next/navigation's useRouter,
 * which is mocked below.
 */

// --- next/navigation (UpgradePrompt's useRouter) -------------------------
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

// --- xlsx (export side-effect) -------------------------------------------
const writeFileMock = vi.fn();
vi.mock("xlsx", () => ({
    utils: {
        json_to_sheet: vi.fn(() => ({})),
        book_new: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: (...args: unknown[]) => writeFileMock(...args),
}));

// --- useOffers (Data_Hook) -----------------------------------------------
const useOffersMock = vi.fn();
vi.mock("../hooks/useOffers", () => ({
    useOffers: () => useOffersMock(),
}));

// --- usePlanGate (Plan_Gate) ---------------------------------------------
const usePlanGateMock = vi.fn();
vi.mock("./usePlanGate", () => ({
    usePlanGate: () => usePlanGateMock(),
}));

// --- lib/scoring: keep real impl but allow scoreOffers to throw ----------
let scoringThrows = false;
vi.mock("../lib/scoring", async (importActual) => {
    const actual = await importActual<typeof import("../lib/scoring")>();
    return {
        ...actual,
        scoreOffers: (...args: Parameters<typeof actual.scoreOffers>) => {
            if (scoringThrows) throw new Error("scoring unavailable");
            return actual.scoreOffers(...args);
        },
    };
});

// Imported after the mocks above are registered.
import OfferMatrix from "./OfferMatrix";
import { WeightSliders } from "./WeightSliders";
import { defaultWeights } from "../lib/scoring";

function makeOffer(overrides: Partial<Offer> = {}): Offer {
    return {
        _id: Math.random().toString(36).slice(2),
        company: "Acme",
        title: "Engineer",
        salaryBase: 100000,
        bonus: 10000,
        equity: 50000,
        signingBonus: 5000,
        growthScore: 7,
        brandScore: 8,
        status: "pending",
        ...overrides,
    };
}

const TWO_OFFERS: Offer[] = [
    makeOffer({ _id: "a", company: "Acme", title: "Engineer", salaryBase: 100000 }),
    makeOffer({ _id: "b", company: "Globex", title: "Senior Engineer", salaryBase: 150000 }),
];

function setOffers(partial: Partial<ReturnType<typeof useOffersMock>> = {}) {
    useOffersMock.mockReturnValue({
        offers: [],
        loading: false,
        error: null,
        fetchOffers: vi.fn(),
        createOffer: vi.fn().mockResolvedValue(undefined),
        updateOffer: vi.fn().mockResolvedValue(undefined),
        deleteOffer: vi.fn().mockResolvedValue(undefined),
        ...partial,
    });
}

const goToPricingMock = vi.fn();

function setPlanGate(allowed: boolean) {
    const exportGate: GateDecision = allowed
        ? { action: "export", allowed: true, reason: "ok", message: null }
        : {
              action: "export",
              allowed: false,
              reason: "pro-required",
              message: EXPORT_UPGRADE_MESSAGE,
          };
    usePlanGateMock.mockReturnValue({
        plan: allowed ? "pro" : "free",
        isPro: allowed,
        loading: false,
        exportGate,
        createJobGate: vi.fn(),
        handleServerRejection: vi.fn(),
        goToPricing: goToPricingMock,
    });
}

function renderMatrix() {
    return renderWithTheme(
        <ToastProvider>
            <OfferMatrix />
        </ToastProvider>
    );
}

beforeEach(() => {
    scoringThrows = false;
    pushMock.mockClear();
    writeFileMock.mockClear();
    goToPricingMock.mockClear();
    setPlanGate(true);
});

describe("OfferMatrix states and export gating", () => {
    describe("empty state (Req 10.4, 10.7)", () => {
        it("shows a single empty state in place of the matrix, sliders, and highlight", () => {
            setOffers({ offers: [] });
            renderMatrix();

            // Empty state is shown.
            expect(screen.getByText("No offers yet")).toBeInTheDocument();

            // The matrix, weight sliders, score explanation, and best-offer
            // highlight are NOT rendered while there are no offers.
            expect(screen.queryByText("Your priorities")).not.toBeInTheDocument();
            expect(
                screen.queryByText("Best fit for your weights")
            ).not.toBeInTheDocument();
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
            expect(screen.queryByRole("slider")).not.toBeInTheDocument();
        });
    });

    describe("scoring-error suppression with input retention (Req 10.8)", () => {
        it("suppresses scores, highlight, and explanation while retaining offers + weights", () => {
            scoringThrows = true;
            setOffers({ offers: TWO_OFFERS });
            renderMatrix();

            // A scoring-unavailable indication is shown.
            expect(screen.getByText("Scoring unavailable")).toBeInTheDocument();

            // Best-offer highlight is suppressed.
            expect(
                screen.queryByText("Best fit for your weights")
            ).not.toBeInTheDocument();
            expect(screen.queryByText("Best")).not.toBeInTheDocument();

            // Score explanation (Scoring_Engine text) is suppressed.
            expect(
                screen.queryByText(/Each factor is normalized across your offers/i)
            ).not.toBeInTheDocument();

            // Scores are suppressed: every fit-score cell renders the em dash.
            // Offers render in both the >=768px table and the below-768px
            // stacked cards (Req 15.7 responsive collapse), so each offer's
            // suppressed score appears once per layout.
            expect(screen.getAllByText("—").length).toBe(TWO_OFFERS.length * 2);

            // Offers are retained (rendered in the comparison table and cards).
            expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
            expect(screen.getAllByText("Globex").length).toBeGreaterThan(0);

            // Weight inputs are retained (sliders still rendered, one per factor).
            expect(screen.getByText("Your priorities")).toBeInTheDocument();
            expect(screen.getAllByRole("slider")).toHaveLength(4);
        });
    });

    describe("weight slider bounds (Req 10.4)", () => {
        it("constrains every weight slider to the inclusive [0, 100] range", () => {
            renderWithTheme(
                <WeightSliders weights={defaultWeights} onChange={vi.fn()} />
            );

            const sliders = screen.getAllByRole("slider") as HTMLInputElement[];
            expect(sliders).toHaveLength(4);
            for (const slider of sliders) {
                expect(slider).toHaveAttribute("type", "range");
                expect(slider).toHaveAttribute("min", "0");
                expect(slider).toHaveAttribute("max", "100");
            }
        });
    });

    describe("free-user export gating (Req 10.10)", () => {
        it("blocks the export and presents the upgrade prompt for a Free_User", async () => {
            const user = userEvent.setup();
            setPlanGate(false); // exportGate.allowed === false
            setOffers({ offers: TWO_OFFERS });
            renderMatrix();

            // No upgrade prompt before the user activates export.
            expect(
                screen.queryByText(EXPORT_UPGRADE_MESSAGE)
            ).not.toBeInTheDocument();

            await user.click(screen.getByRole("button", { name: /export/i }));

            // Export is blocked: no CSV is written.
            expect(writeFileMock).not.toHaveBeenCalled();

            // The Plan_Gate upgrade prompt is presented.
            expect(screen.getByText(EXPORT_UPGRADE_MESSAGE)).toBeInTheDocument();

            // Its CTA navigates to pricing via the gate's goToPricing.
            await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));
            expect(goToPricingMock).toHaveBeenCalledTimes(1);
        });

        it("runs the export for a Pro_User", async () => {
            const user = userEvent.setup();
            setPlanGate(true); // exportGate.allowed === true
            setOffers({ offers: TWO_OFFERS });
            renderMatrix();

            await user.click(screen.getByRole("button", { name: /export csv/i }));

            // The CSV export side-effect runs and no upgrade prompt appears.
            expect(writeFileMock).toHaveBeenCalledTimes(1);
            expect(
                screen.queryByText(EXPORT_UPGRADE_MESSAGE)
            ).not.toBeInTheDocument();
        });
    });
});
