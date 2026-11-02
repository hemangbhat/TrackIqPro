import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { renderWithTheme, screen } from "../../test/render";

/**
 * The landing page (`src/app/page.tsx`) is a client component wrapped in
 * MarketingShell. It navigates via `next/navigation` useRouter().push inside a
 * `navigate()` helper wrapped in try/catch: on failure it stays on the landing
 * route and renders a role="alert" error banner (Req 5.7).
 *
 * We mock `next/navigation` so we can both capture push targets and simulate a
 * navigation failure (push throws). `pushMock` is hoisted so the mock factory
 * can reference it. MarketingShell also imports next/link (which may read these
 * hooks) so usePathname / useSearchParams are stubbed too.
 */
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import Home from "./page";

beforeEach(() => {
  pushMock.mockReset();
  // Default: navigation succeeds (no-op).
  pushMock.mockImplementation(() => {});
});

/** Assert a list of elements appears in document order (each follows the prior). */
function expectInDocumentOrder(elements: (HTMLElement | null)[]) {
  for (let i = 0; i < elements.length - 1; i++) {
    const a = elements[i];
    const b = elements[i + 1];
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const relation = a!.compareDocumentPosition(b!);
    // b should come AFTER a in the document.
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
}

describe("Landing page structure (Req 5.1, 5.2)", () => {
  it("renders the hero with headline, subcopy, and primary/demo CTAs", () => {
    renderWithTheme(<Home />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /every score shows its work/i
    );
    expect(
      screen.getByText(/track applications, keep private interview notes/i)
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: /get started/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /open the live demo/i })
    ).toHaveAttribute("href", "/demo");
  });

  it("draws the hero score from the real engine, as signed contributions", () => {
    const { container } = renderWithTheme(<Home />);

    // The breakdown is a <figure> of signed contributions from lib/career-fit.
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    expect(figure!.textContent).toMatch(/\+\d+/);
    expect(figure!.textContent).toMatch(/−\d+/);
    expect(figure!.textContent).toMatch(/real engine/i);
  });

  it("lets visitors re-weight the sample offers", () => {
    renderWithTheme(<Home />);

    const ranking = screen.getByRole("list", { name: /offer ranking/i });
    expect(ranking.querySelectorAll("li")).toHaveLength(3);

    const reset = screen.getByRole("button", { name: /reset weights/i });
    expect(reset).toBeDisabled();

    const comp = screen.getByRole("slider", { name: /compensation/i });
    fireEvent.change(comp, { target: { value: "0" } });
    expect(comp).toHaveValue("0");
    expect(reset).toBeEnabled();
  });

  it("lists all six engines", () => {
    renderWithTheme(<Home />);
    for (const name of [
      "Job Fit",
      "Offer Intelligence",
      "Offer Score",
      "Career Health",
      "Follow-up Priority",
      "Interview Reflection",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("does not show invented social proof", () => {
    renderWithTheme(<Home />);
    expect(screen.queryByText(/trusted by/i)).toBeNull();
    expect(screen.queryByText(/most popular/i)).toBeNull();
    expect(screen.queryByText(/maya chen/i)).toBeNull();
  });

  it("renders sections in top-to-bottom order: hero, what-if, engines, tracker, pricing preview, closing CTA, footer", () => {
    const { container } = renderWithTheme(<Home />);

    expectInDocumentOrder([
      screen.getByRole("heading", { level: 1 }),
      screen.getByRole("heading", { name: /watch the ranking answer/i }),
      screen.getByRole("heading", { name: /six engines/i }),
      screen.getByRole("heading", { name: /the tracker you need/i }),
      screen.getByRole("heading", { name: /free until your search outgrows it/i }),
      screen.getByRole("heading", { name: /your next decision deserves reasons/i }),
      container.querySelector("footer") as HTMLElement,
    ]);
  });
});

describe("Landing page icons (Req 5.4, 5.5)", () => {
  it("renders icons as SVG elements", () => {
    const { container } = renderWithTheme(<Home />);
    // Icons on the page (CTA arrows, plan checkmarks) are SVG.
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it("does not render any emoji as an icon", () => {
    const { container } = renderWithTheme(<Home />);
    const text = container.textContent ?? "";
    // \p{Emoji_Presentation} matches characters rendered as emoji by default.
    // (Unlike \p{Extended_Pictographic}, it excludes text-default symbols such
    // as the copyright sign used in the footer.)
    const emojiPattern = /\p{Emoji_Presentation}/u;
    expect(emojiPattern.test(text)).toBe(false);
  });
});

describe("Landing page navigation targets (Req 5.3, 5.6)", () => {
  it('"Get started" navigates to the sign-up page', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Home />);

    // Target a page CTA (not the MarketingShell topbar link, which is an <a>).
    const getStarted = screen
      .getAllByRole("button", { name: /get started/i })
      .find((b) => b.closest("a") === null);
    expect(getStarted).toBeDefined();

    await user.click(getStarted!);

    expect(pushMock).toHaveBeenCalledWith("/sign-up");
  });

  it('"Try the live demo" navigates to the demo', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Home />);

    await user.click(screen.getByRole("button", { name: /try the live demo/i }));

    expect(pushMock).toHaveBeenCalledWith("/demo");
  });

  it("the pricing preview CTA navigates to the pricing page", async () => {
    const user = userEvent.setup();
    renderWithTheme(<Home />);

    await user.click(
      screen.getByRole("button", { name: /see full pricing/i })
    );

    expect(pushMock).toHaveBeenCalledWith("/pricing");
  });
});

describe("Landing page navigation failure (Req 5.7)", () => {
  it("stays on the landing route and shows an error alert when navigation fails", async () => {
    const user = userEvent.setup();
    // Simulate a navigation failure: push throws.
    pushMock.mockImplementation(() => {
      throw new Error("navigation failed");
    });

    renderWithTheme(<Home />);

    // No error alert before the failed navigation attempt.
    expect(screen.queryByRole("alert")).toBeNull();

    const getStarted = screen
      .getAllByRole("button", { name: /get started/i })
      .find((b) => b.closest("a") === null);
    await user.click(getStarted!);

    // push was attempted (and threw)...
    expect(pushMock).toHaveBeenCalledWith("/sign-up");

    // ...the page surfaces an error alert and remains on the landing route.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't open that page/i);

    // Landing content is still present (we did not navigate away).
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /every score shows its work/i
    );
  });
});
