import React from "react";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { configureAxe } from "vitest-axe";
import * as axeMatchers from "vitest-axe/matchers";
import { renderWithTheme, screen, within } from "../test/render";
import { ToastProvider } from "./ui/Toast";
import { Badge, Field, Input, Button } from "./ui/primitives";
import JobTable from "./JobTable";
import JobFormDrawer from "./JobFormDrawer";
import PricingTable from "./PricingTable";
import type { Job } from "../types";

/**
 * Task 18.5 — Accessibility / responsive unit tests.
 *
 * Covers, across representative surfaces (JobTable, JobFormDrawer, the
 * Field/Label/Badge primitives, PricingTable, and the Settings page):
 *
 *   (1) Automated axe checks report no violations on rendered components/pages
 *       (Req 15.1, 15.2, 15.5 — accessibility conformance baseline).
 *   (2) Focus-ring visibility — interactive controls carry the global
 *       `focus-visible:ring` / `focus:ring-2` indigo focus treatment (Req 15.2).
 *   (3) Label associations — every form input is reachable via getByLabelText,
 *       i.e. it is programmatically associated with a visible label (Req 15.1).
 *   (4) Color-independent status — status Badges convey their meaning through
 *       text content, not color alone (Req 15.5).
 *   (5) Responsive table→card collapse — JobTable renders the `hidden md:block`
 *       table wrapper and the `md:hidden` card wrapper, and grids use the
 *       single-column-first responsive class structure (Req 15.6, 15.7).
 *
 * ── jsdom / axe limitations (documented) ──────────────────────────────────
 * jsdom does not perform layout or compute styles, so two things cannot be
 * verified here and require a real browser (Playwright / manual audit):
 *   • axe's `color-contrast` rule needs computed pixel colors → disabled below.
 *     Token contrast is covered separately by the theme-parity property test.
 *   • "No horizontal scroll at 375/768/1024/1440px" cannot be measured because
 *     jsdom reports zero-size boxes. We instead assert the responsive class
 *     structure (the `md:` breakpoint wrappers and `grid-cols-1` single-column
 *     reflow) as a proxy; true visual verification needs a real viewport.
 * axe's `region` rule (all content inside landmarks) is disabled for the
 * component-level renders because these surfaces are normally mounted inside a
 * shell that supplies the <main>/<nav> landmarks.
 */

expect.extend(axeMatchers);

/**
 * A shared axe runner with the rules that jsdom cannot evaluate disabled. See
 * the limitations note above.
 */
const a11yCheck = configureAxe({
    rules: {
        "color-contrast": { enabled: false }, // needs real layout/computed colors
        region: { enabled: false }, // landmarks are provided by the page shell
    },
});

// UpgradePrompt (gated branches) and the Settings page read next/navigation.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

// next-themes useTheme is consumed by the Settings ThemeSelector; keep the real
// provider from the render helper and only stub the hook return.
vi.mock("next-themes", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next-themes")>();
    return {
        ...actual,
        useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
    };
});

// Settings page dependencies.
vi.mock("@clerk/nextjs", () => ({
    useUser: () => ({
        user: {
            id: "u_test",
            fullName: "Ada Lovelace",
            primaryEmailAddress: { emailAddress: "ada@example.com" },
        },
        isLoaded: true,
    }),
    useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("./useUserPlan", () => ({
    useUserPlan: () => ({
        plan: "pro",
        customerId: null,
        status: "active",
        trialEnd: null,
        isPro: true,
        loading: false,
    }),
}));

// Imported after the mocks above are registered.
import SettingsPage from "../src/app/dashboard/settings/page";

/**
 * jsdom always returns null for `offsetParent`, which the Drawer's focus trap
 * uses to detect visible candidates. Shim it so the drawer's labeled inputs are
 * treated as visible (needed for the JobFormDrawer label/axe assertions).
 */
let originalOffsetParent: PropertyDescriptor | undefined;
beforeAll(() => {
    originalOffsetParent = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "offsetParent"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
        configurable: true,
        get(this: HTMLElement) {
            return this.parentNode ?? null;
        },
    });
});
afterAll(() => {
    if (originalOffsetParent) {
        Object.defineProperty(
            HTMLElement.prototype,
            "offsetParent",
            originalOffsetParent
        );
    } else {
        // @ts-expect-error remove the shim if there was no original descriptor
        delete HTMLElement.prototype.offsetParent;
    }
});

const jobs: Job[] = [
    {
        _id: "j1",
        userId: "u1",
        title: "Frontend Engineer",
        company: "Acme Inc.",
        location: "Remote",
        stage: "interview",
        status: "active",
        salary: 120000,
        dateApplied: "2024-01-10T00:00:00.000Z",
        createdAt: "2024-01-10T00:00:00.000Z",
        updatedAt: "2024-01-10T00:00:00.000Z",
    },
    {
        _id: "j2",
        userId: "u1",
        title: "Backend Engineer",
        company: "Globex",
        location: "NYC",
        stage: "applied",
        status: "active",
        salary: 130000,
        dateApplied: "2024-02-01T00:00:00.000Z",
        createdAt: "2024-02-01T00:00:00.000Z",
        updatedAt: "2024-02-01T00:00:00.000Z",
    },
];

function noop() {}

function renderJobTable() {
    return renderWithTheme(
        <main>
            <JobTable
                jobs={jobs}
                loading={false}
                error={null}
                onRetry={noop}
                onOpen={noop}
                onEdit={noop}
                onDelete={noop}
            />
        </main>
    );
}

function renderJobForm() {
    return renderWithTheme(
        <ToastProvider>
            <JobFormDrawer
                open
                mode="create"
                onClose={noop}
                onSubmit={vi.fn().mockResolvedValue(undefined)}
            />
        </ToastProvider>
    );
}

// ---------------------------------------------------------------------------
// (1) Automated axe checks — no violations on representative surfaces
// ---------------------------------------------------------------------------
describe("axe — no accessibility violations (Req 15.1, 15.2, 15.5)", () => {
    it("JobTable (ready state) has no axe violations", async () => {
        const { container } = renderJobTable();
        const results = await a11yCheck(container);
        expect(results).toHaveNoViolations();
    });

    it("JobFormDrawer (labeled form) has no axe violations", async () => {
        renderJobForm();
        const dialog = screen.getByRole("dialog");
        const results = await a11yCheck(dialog);
        expect(results).toHaveNoViolations();
    });

    it("PricingTable has no axe violations", async () => {
        const { container } = renderWithTheme(
            <main>
                <PricingTable currentPlan="free" onUpgrade={noop} onManageBilling={noop} />
            </main>
        );
        const results = await a11yCheck(container);
        expect(results).toHaveNoViolations();
    });

    it("Settings page has no axe violations", async () => {
        const { container } = renderWithTheme(
            <ToastProvider>
                <main>
                    <SettingsPage />
                </main>
            </ToastProvider>
        );
        const results = await a11yCheck(container);
        expect(results).toHaveNoViolations();
    });

    it("Field/Label/Badge primitives have no axe violations", async () => {
        const { container } = renderWithTheme(
            <main>
                <Field label="Email" htmlFor="email" hint="We never share it.">
                    <Input id="email" type="email" />
                </Field>
                <Badge tone="interview">interview</Badge>
            </main>
        );
        const results = await a11yCheck(container);
        expect(results).toHaveNoViolations();
    });
});

// ---------------------------------------------------------------------------
// (2) Focus-ring visibility — interactive controls carry the focus treatment
// ---------------------------------------------------------------------------
describe("focus-ring visibility (Req 15.2)", () => {
    it("Button renders the indigo focus-visible ring classes", () => {
        renderWithTheme(<Button>Save</Button>);
        const btn = screen.getByRole("button", { name: "Save" });
        expect(btn.className).toContain("focus-visible:ring-2");
        expect(btn.className).toContain("focus-visible:ring-indigo-500");
    });

    it("form inputs render a visible focus ring", () => {
        renderWithTheme(
            <Field label="Name" htmlFor="name">
                <Input id="name" />
            </Field>
        );
        const input = screen.getByLabelText("Name");
        expect(input.className).toContain("focus:ring-2");
        expect(input.className).toContain("focus:ring-indigo-500");
    });

    it("JobTable row action controls carry a focus-visible ring", () => {
        const { container } = renderJobTable();
        const tableWrapper = container.querySelector(".hidden.md\\:block") as HTMLElement;
        const openBtn = within(tableWrapper).getByRole("button", {
            name: /open frontend engineer/i,
        });
        expect(openBtn.className).toContain("focus-visible:ring-2");
    });
});

// ---------------------------------------------------------------------------
// (3) Label associations — inputs reachable by their visible label
// ---------------------------------------------------------------------------
describe("label associations (Req 15.1)", () => {
    it("every JobFormDrawer input is reachable via its visible label", () => {
        renderJobForm();
        // getByLabelText throws if the programmatic association is missing.
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
        expect(screen.getByLabelText("Company")).toBeInTheDocument();
        expect(screen.getByLabelText("Location (optional)")).toBeInTheDocument();
        expect(screen.getByLabelText("Stage")).toBeInTheDocument();
        expect(screen.getByLabelText("Status")).toBeInTheDocument();
        expect(screen.getByLabelText("Salary (optional)")).toBeInTheDocument();
        expect(screen.getByLabelText("Link (optional)")).toBeInTheDocument();
        expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
        expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
    });

    it("hint text is referenced from the input via aria-describedby", () => {
        renderWithTheme(
            <Field label="Salary" htmlFor="salary" hint="Annual base.">
                <Input id="salary" />
            </Field>
        );
        const input = screen.getByLabelText("Salary");
        const describedBy = input.getAttribute("aria-describedby");
        expect(describedBy).toBeTruthy();
        expect(document.getElementById(describedBy as string)).toHaveTextContent(
            "Annual base."
        );
    });
});

// ---------------------------------------------------------------------------
// (4) Color-independent status — status text is present, not color alone
// ---------------------------------------------------------------------------
describe("color-independent status (Req 15.5)", () => {
    it("status Badges convey the status via text content", () => {
        renderWithTheme(
            <div>
                <Badge tone="interview">interview</Badge>
                <Badge tone="offer">offer</Badge>
                <Badge tone="rejected">rejected</Badge>
            </div>
        );
        // The status word is in the DOM regardless of color.
        expect(screen.getByText("interview")).toBeInTheDocument();
        expect(screen.getByText("offer")).toBeInTheDocument();
        expect(screen.getByText("rejected")).toBeInTheDocument();
    });

    it("JobTable rows render the stage as readable text in both layouts", () => {
        renderJobTable();
        // "interview" stage text appears in the table row and the mobile card.
        expect(screen.getAllByText("interview").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("applied").length).toBeGreaterThanOrEqual(1);
    });

    it("PricingTable feature cells expose included/not-included as text, not color", () => {
        renderWithTheme(
            <PricingTable currentPlan="free" onUpgrade={noop} onManageBilling={noop} />
        );
        // sr-only text spells out the boolean state so it is not color-only.
        expect(screen.getAllByText(/: included/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/: not included/i).length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// (5) Responsive table→card collapse + single-column reflow (proxy)
// ---------------------------------------------------------------------------
describe("responsive table→card collapse (Req 15.6, 15.7 — class-structure proxy)", () => {
    it("renders the md+ table inside a `hidden md:block` wrapper", () => {
        const { container } = renderJobTable();
        const tableWrapper = container.querySelector(".hidden.md\\:block");
        expect(tableWrapper).not.toBeNull();
        expect(tableWrapper!.querySelector("table")).not.toBeNull();
    });

    it("renders the sub-md stacked cards inside a `md:hidden` wrapper (no table)", () => {
        const { container } = renderJobTable();
        const cardWrapper = Array.from(
            container.querySelectorAll(".md\\:hidden")
        ).find((el) => !el.classList.contains("md:block")) as HTMLElement | undefined;
        expect(cardWrapper).toBeDefined();
        expect(cardWrapper!.querySelector("table")).toBeNull();
    });

    it("renders every job in BOTH layouts so the data set is identical across breakpoints", () => {
        renderJobTable();
        for (const job of jobs) {
            // Once in the table, once in the mobile card.
            expect(screen.getAllByText(job.title)).toHaveLength(2);
        }
    });

    it("multi-column grids declare a single-column default that expands at md+ (reflow proxy)", () => {
        // JobFormDrawer's stage/status row reflows from one column to two at sm+.
        const { container } = renderJobForm();
        const grid = container.querySelector(".grid-cols-1");
        expect(grid).not.toBeNull();
        // It only becomes multi-column at a breakpoint (sm: / md: / lg:).
        expect(grid!.className).toMatch(/(sm|md|lg):grid-cols-\d/);
    });
});
