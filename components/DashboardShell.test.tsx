import React from "react";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithTheme, screen, waitFor } from "../test/render";

/**
 * DashboardShell renders Clerk's <UserButton /> and a PlanBadge (which reads
 * useUserPlan -> Clerk's useUser). Mock both Clerk and useUserPlan so the shell
 * renders deterministically without an auth provider, and mock usePathname so
 * navigation-active resolution is stable.
 */
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
  useUser: () => ({ user: { id: "u_1" }, isLoaded: true }),
}));

vi.mock("./useUserPlan", () => ({
  useUserPlan: () => ({
    plan: "free",
    customerId: null,
    status: "active",
    trialEnd: null,
    isPro: false,
    loading: false,
  }),
}));

const usePathnameMock = vi.fn(() => "/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import DashboardShell from "./DashboardShell";

/**
 * jsdom does not compute layout, so `HTMLElement.offsetParent` is always null.
 * The Drawer's focus-trap filters focusable candidates via `offsetParent`, so
 * shim it to report the parent node for attached elements (mirrors the approach
 * in Drawer.test.tsx). Responsiveness itself is driven by Tailwind `lg:` classes
 * which jsdom cannot evaluate, so the responsive assertions below check for the
 * presence of those classes rather than computed visibility.
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
    Object.defineProperty(HTMLElement.prototype, "offsetParent", originalOffsetParent);
  } else {
    // @ts-expect-error - remove the shim if there was no original descriptor.
    delete HTMLElement.prototype.offsetParent;
  }
});

beforeEach(() => {
  usePathnameMock.mockReturnValue("/dashboard");
});

describe("DashboardShell responsive chrome", () => {
  it("renders the fixed w-64 sidebar shown on lg+ (>=1024px)", () => {
    const { container } = renderWithTheme(
      <DashboardShell>
        <p>content</p>
      </DashboardShell>
    );

    const sidebar = container.querySelector("aside");
    expect(sidebar).not.toBeNull();
    // Fixed sidebar, 16rem wide, hidden below lg and shown as a flex column on lg+.
    expect(sidebar!.className).toContain("w-64");
    expect(sidebar!.className).toContain("hidden");
    expect(sidebar!.className).toContain("lg:flex");
    expect(sidebar!.className).toContain("fixed");
  });

  it("offsets the main content by the sidebar width on lg+ (lg:pl-64)", () => {
    const { container } = renderWithTheme(
      <DashboardShell>
        <p>content</p>
      </DashboardShell>
    );

    const offsetColumn = container.querySelector(".lg\\:pl-64");
    expect(offsetColumn).not.toBeNull();
  });

  it("renders a keyboard- and pointer-operable drawer-trigger hidden on lg+ (below 1024px)", () => {
    renderWithTheme(
      <DashboardShell>
        <p>content</p>
      </DashboardShell>
    );

    const trigger = screen.getByLabelText("Open navigation menu");
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe("BUTTON");
    // Present below lg; hidden once the sidebar appears at lg+.
    expect(trigger.className).toContain("lg:hidden");
    // Operable by keyboard (a native button) and announces the drawer it controls.
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  });
});

describe("DashboardShell drawer behavior", () => {
  it("opens the slide-in drawer when the trigger is activated", async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <DashboardShell>
        <p>content</p>
      </DashboardShell>
    );

    // No dialog before activation.
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByLabelText("Open navigation menu"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and restores focus to the drawer-trigger", async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <DashboardShell>
        <p>content</p>
      </DashboardShell>
    );

    const trigger = screen.getByLabelText("Open navigation menu");

    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    // Focus moves into the open drawer (away from the trigger).
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    await user.keyboard("{Escape}");

    // Drawer closes and focus returns to the element that opened it.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
