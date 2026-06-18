import React from "react";
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    vi,
} from "vitest";
import userEvent from "@testing-library/user-event";
import {
    renderWithTheme,
    screen,
    waitFor,
    fireEvent,
} from "../test/render";
import { ToastProvider } from "./ui/Toast";
import JobFormDrawer, { type JobFormDrawerProps } from "./JobFormDrawer";
import { JOB_LIMIT_UPGRADE_MESSAGE } from "../lib/plan-gate";

/**
 * Unit tests for JobFormDrawer validation and plan gating (Task 11.2).
 *
 * Covers:
 *   - Required/format validation blocks onSubmit, focuses the first invalid
 *     input, and shows per-field messages via aria-describedby
 *     (Req 8.3, 8.6, 15.8).
 *   - Entered values are retained after a failed submit (Req 8.7).
 *   - Valid submit calls onSubmit then onClose with a success toast (Req 8.5).
 *   - onSubmit rejection keeps the drawer open with values + error toast
 *     (Req 8.7).
 *   - Free-limit gating shows the inline upgrade prompt, disables submit, and
 *     never calls onSubmit (Req 4.2).
 *
 * The component renders inside the real ToastProvider so toast paths are
 * exercised end-to-end. UpgradePrompt (shown in the gated branch) reads
 * next/navigation's useRouter, which is mocked below.
 */

// UpgradePrompt calls useRouter().push; provide a stub so the gated branch
// mounts without an App Router context.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

/**
 * jsdom does not compute layout, so `HTMLElement.offsetParent` is always null.
 * The Drawer's focus-trap filters focus candidates by visibility via
 * `offsetParent`; shim it so attached elements report a truthy offsetParent.
 * This is required for the focus-to-first-invalid assertions to be reliable.
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
        // @ts-expect-error - remove the shim if there was no original descriptor.
        delete HTMLElement.prototype.offsetParent;
    }
});

beforeEach(() => {
    pushMock.mockClear();
});

function renderDrawer(props: Partial<JobFormDrawerProps> = {}) {
    const onClose = props.onClose ?? vi.fn();
    const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
    const result = renderWithTheme(
        <ToastProvider>
            <JobFormDrawer
                open
                mode="create"
                onClose={onClose}
                onSubmit={onSubmit}
                {...props}
            />
        </ToastProvider>
    );
    return { ...result, onClose, onSubmit };
}

const titleInput = () =>
    screen.getByLabelText("Title") as HTMLInputElement;
const companyInput = () =>
    screen.getByLabelText("Company") as HTMLInputElement;
const salaryInput = () =>
    screen.getByLabelText("Salary (optional)") as HTMLInputElement;
const submitButton = (name: RegExp = /add job/i) =>
    screen.getByRole("button", { name });

describe("JobFormDrawer validation and gating", () => {
    describe("required-field validation (Req 8.3, 8.6, 15.8)", () => {
        it("blocks onSubmit, focuses the first invalid input, and shows per-field messages", async () => {
            const user = userEvent.setup();
            const { onSubmit, onClose } = renderDrawer();

            // Title and company are empty by default in create mode.
            await user.click(submitButton());

            // Mutation is blocked.
            expect(onSubmit).not.toHaveBeenCalled();
            // Drawer stays open (close not invoked).
            expect(onClose).not.toHaveBeenCalled();

            // Per-field messages are shown.
            expect(screen.getByText("Title is required.")).toBeInTheDocument();
            expect(screen.getByText("Company is required.")).toBeInTheDocument();

            // First invalid input (title) receives focus.
            expect(document.activeElement).toBe(titleInput());

            // Error is associated via aria-describedby + aria-invalid (Req 15.8).
            const describedBy = titleInput().getAttribute("aria-describedby");
            expect(describedBy).toBeTruthy();
            expect(titleInput()).toHaveAttribute("aria-invalid", "true");
            const errorEl = document.getElementById(describedBy as string);
            expect(errorEl).toHaveTextContent("Title is required.");
        });

    });

    describe("format validation (Req 8.3)", () => {
        it("blocks submit and focuses salary when salary is negative", async () => {
            const user = userEvent.setup();
            const { onSubmit } = renderDrawer();

            await user.type(titleInput(), "Engineer");
            await user.type(companyInput(), "Acme");
            fireEvent.change(salaryInput(), { target: { value: "-5" } });

            await user.click(submitButton());

            expect(onSubmit).not.toHaveBeenCalled();
            expect(
                screen.getByText(
                    "Salary must be a number greater than or equal to 0."
                )
            ).toBeInTheDocument();
            expect(document.activeElement).toBe(salaryInput());
        });
    });

    describe("value retention on failed submit (Req 8.7)", () => {
        it("keeps entered values and shows an error toast when onSubmit rejects", async () => {
            const user = userEvent.setup();
            const onSubmit = vi.fn().mockRejectedValue(new Error("Server down"));
            const { onClose } = renderDrawer({ onSubmit });

            await user.type(titleInput(), "Engineer");
            await user.type(companyInput(), "Acme");
            await user.click(submitButton());

            await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

            // Error toast surfaces the failure message.
            expect(await screen.findByText("Server down")).toBeInTheDocument();
            // Drawer stays open (close not called) with values intact.
            expect(onClose).not.toHaveBeenCalled();
            expect(titleInput()).toHaveValue("Engineer");
            expect(companyInput()).toHaveValue("Acme");
        });
    });

    describe("success path (Req 8.5)", () => {
        it("calls onSubmit, closes the drawer, and shows a success toast", async () => {
            const user = userEvent.setup();
            const onSubmit = vi.fn().mockResolvedValue(undefined);
            const { onClose } = renderDrawer({ onSubmit });

            await user.type(titleInput(), "Engineer");
            await user.type(companyInput(), "Acme");
            await user.click(submitButton());

            await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
            expect(await screen.findByText("Job added.")).toBeInTheDocument();
        });
    });

    describe("free-limit gating branch (Req 4.2)", () => {
        it("shows the upgrade prompt, disables submit, and never calls onSubmit", async () => {
            const user = userEvent.setup();
            const { onSubmit } = renderDrawer({
                planGate: { atLimit: true, limit: 5, isPro: false },
            });

            // Inline upgrade prompt is shown.
            expect(
                screen.getByText(JOB_LIMIT_UPGRADE_MESSAGE)
            ).toBeInTheDocument();

            // Submit control is disabled.
            const submit = submitButton();
            expect(submit).toBeDisabled();

            // Attempting to submit does not invoke the mutation.
            await user.click(submit);
            expect(onSubmit).not.toHaveBeenCalled();
        });
    });
});
