import React from "react";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, waitFor } from "../../test/render";
import { Drawer } from "./Drawer";

/**
 * jsdom does not compute layout, so `HTMLElement.offsetParent` is always null.
 * The Drawer's focus-trap filters candidates by visibility via `offsetParent`,
 * so we shim it to report the parent node for attached elements. This lets the
 * visibility-based focusable detection behave as it would in a real browser.
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
      // Attached, non-hidden elements report a truthy offsetParent.
      return this.parentNode ?? null;
    },
  });
});

afterAll(() => {
  if (originalOffsetParent) {
    Object.defineProperty(HTMLElement.prototype, "offsetParent", originalOffsetParent);
  } else {
    // @ts-expect-error - remove the shim if there was no original descriptor.
    delete HTMLElement.prototype.offsetParent;
  }
});

function DrawerHarness({
  open,
  onClose = () => {},
}: {
  open: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <button data-testid="trigger">Open drawer</button>
      <Drawer
        open={open}
        onClose={onClose}
        title="Test Drawer"
        footer={<button>Save</button>}
      >
        <button>First field</button>
        <button>Second field</button>
      </Drawer>
    </>
  );
}

describe("Drawer accessibility behavior", () => {
  describe("focus trap", () => {
    it("cycles to the first focusable when Tab is pressed on the last", async () => {
      const user = userEvent.setup();
      renderWithTheme(<DrawerHarness open />);

      const closeButton = screen.getByLabelText("Close dialog");
      const saveButton = screen.getByRole("button", { name: "Save" });

      // Move to the last focusable element, then Tab forward.
      saveButton.focus();
      expect(document.activeElement).toBe(saveButton);

      await user.keyboard("{Tab}");

      expect(document.activeElement).toBe(closeButton);
    });

    it("cycles to the last focusable when Shift+Tab is pressed on the first", async () => {
      const user = userEvent.setup();
      renderWithTheme(<DrawerHarness open />);

      const closeButton = screen.getByLabelText("Close dialog");
      const saveButton = screen.getByRole("button", { name: "Save" });

      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);

      await user.keyboard("{Shift>}{Tab}{/Shift}");

      expect(document.activeElement).toBe(saveButton);
    });

    it("keeps focus inside the dialog (role=dialog, aria-modal) on open", async () => {
      renderWithTheme(<DrawerHarness open />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");

      // Focus is moved into the panel; the active element is contained by it.
      await waitFor(() => {
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    });
  });

  describe("Escape to close", () => {
    it("invokes onClose when Escape is pressed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithTheme(<DrawerHarness open onClose={onClose} />);

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not invoke onClose on Escape when closed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithTheme(<DrawerHarness open={false} onClose={onClose} />);

      await user.keyboard("{Escape}");

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("focus restoration", () => {
    it("restores focus to the triggering element when closed", async () => {
      const { rerender } = renderWithTheme(<DrawerHarness open={false} />);

      // Simulate the trigger being the active element before opening.
      const trigger = screen.getByTestId("trigger");
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      // Open: focus moves into the panel (away from the trigger).
      rerender(<DrawerHarness open />);
      await waitFor(() => {
        expect(document.activeElement).not.toBe(trigger);
      });

      // Close: focus returns to the element that opened the drawer.
      rerender(<DrawerHarness open={false} />);
      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });

  describe("body scroll lock", () => {
    it("locks body scroll while open and restores it on close", () => {
      expect(document.body.style.overflow).toBe("");

      const { rerender } = renderWithTheme(<DrawerHarness open />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<DrawerHarness open={false} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("does not lock body scroll when rendered closed", () => {
      renderWithTheme(<DrawerHarness open={false} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("toggles the lock across an open/close/open cycle", () => {
      const { rerender } = renderWithTheme(<DrawerHarness open={false} />);
      expect(document.body.style.overflow).toBe("");

      rerender(<DrawerHarness open />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<DrawerHarness open={false} />);
      expect(document.body.style.overflow).toBe("");

      rerender(<DrawerHarness open />);
      expect(document.body.style.overflow).toBe("hidden");
    });
  });
});
