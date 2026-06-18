import React from "react";
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    vi,
} from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen } from "../test/render";
import { NoteEditorDrawer } from "./NoteEditorDrawer";

/**
 * Task 15.3 — NoteEditorDrawer required-field validation (Req 11.4, 15.8).
 *
 * When title or content is empty on save, the save must be blocked: an inline
 * validation message identifies the missing field, focus moves to the first
 * invalid input, and `onSubmit` is NOT invoked. A valid submit calls
 * `onSubmit` with the trimmed values.
 */

/**
 * jsdom does not compute layout, so `HTMLElement.offsetParent` is always null.
 * The Drawer's focus-trap filters focus candidates by visibility via
 * `offsetParent`; shim it so attached elements report a truthy offsetParent and
 * the focus-to-first-invalid assertions are reliable.
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

function renderDrawer(onSubmit = vi.fn().mockResolvedValue(undefined)) {
    const onClose = vi.fn();
    const result = renderWithTheme(
        <NoteEditorDrawer
            open
            mode="create"
            jobs={[]}
            onClose={onClose}
            onSubmit={onSubmit}
        />
    );
    return { ...result, onSubmit, onClose };
}

const titleInput = () => screen.getByLabelText("Title") as HTMLInputElement;
const contentInput = () =>
    screen.getByLabelText("Content") as HTMLTextAreaElement;
const submitButton = () => screen.getByRole("button", { name: /add note/i });

describe("NoteEditorDrawer required-field validation (Req 11.4, 15.8)", () => {
    it("blocks save, shows both inline messages, and focuses title when both fields are empty", async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderDrawer();

        await user.click(submitButton());

        // Mutation is blocked.
        expect(onSubmit).not.toHaveBeenCalled();

        // Per-field inline messages identify the missing fields.
        expect(screen.getByText("Title is required.")).toBeInTheDocument();
        expect(screen.getByText("Content is required.")).toBeInTheDocument();

        // First invalid field (title) receives focus.
        expect(document.activeElement).toBe(titleInput());
    });

    it("blocks save and focuses content when only the title is filled", async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderDrawer();

        await user.type(titleInput(), "Onsite recap");
        await user.click(submitButton());

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByText("Content is required.")).toBeInTheDocument();
        expect(screen.queryByText("Title is required.")).toBeNull();
        expect(document.activeElement).toBe(contentInput());
    });

    it("blocks save when content is only whitespace", async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderDrawer();

        await user.type(titleInput(), "Phone screen");
        await user.type(contentInput(), "   ");
        await user.click(submitButton());

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByText("Content is required.")).toBeInTheDocument();
    });

    it("calls onSubmit with trimmed values when both required fields are provided", async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderDrawer();

        await user.type(titleInput(), "  Onsite recap  ");
        await user.type(contentInput(), "  System design round.  ");
        await user.click(submitButton());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Onsite recap",
                content: "System design round.",
            })
        );
    });
});
