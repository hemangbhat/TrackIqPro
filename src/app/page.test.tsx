import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
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
  it("renders the hero with headline, subcopy, and primary/secondary CTAs", () => {
    renderWithTheme(<Home />);

    // Headline (h1) — the words are split across spans, so match a fragment.
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(/command center/i);

    // Subcopy.
    expect(
      screen.getByText(/track applications, keep private interview notes/i)
    ).toBeInTheDocument();

    // Primary "Get started" and secondary "See pricing" CTAs exist on the page.
    expect(
      screen.getAllByRole("button", { name: /get started/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /^see pricing$/i }).length
    ).toBeGreaterThan(0);
  });

  it("renders a feature grid with at least 3 features", () => {
    renderWithTheme(<Home />);

    // Feature section heading is present...
    expect(
      screen.getByRole("heading", { name: /everything your search needs/i })
    ).toBeInTheDocument();

    // ...and the known feature titles render (>= 3). Use queryAllByText because
    // some labels (e.g. "Interview notes") also appear in the pricing preview.
    const featureTitles = [
      "Application tracker",
      "Interview notes",
      "Offer decision engine",
      "Analytics dashboard",
    ].filter((t) => screen.queryAllByText(t).length > 0);
    expect(featureTitles.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the social proof section with at least one testimonial", () => {
    const { container } = renderWithTheme(<Home />);

    expect(
      screen.getByRole("heading", { name: /loved by focused job seekers/i })
    ).toBeInTheDocument();

    // A testimonial is a <blockquote>; require at least one.
    const quotes = container.querySelectorAll("blockquote");
    expect(quotes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders sections in top-to-bottom order: hero, features, how-it-works, pricing preview, social proof, closing CTA, footer", () => {
    const { container } = renderWithTheme(<Home />);

    const hero = screen.getByRole("heading", { level: 1 });
    const features = screen.getByRole("heading", {
      name: /everything your search needs/i,
    });
    const howItWorks = screen.getByRole("heading", { name: /^how it works$/i });
    const pricingPreview = screen.getByRole("heading", {
      name: /start free, upgrade when it counts/i,
    });
    const socialProof = screen.getByRole("heading", {
      name: /loved by focused job seekers/i,
    });
    const closingCta = screen.getByRole("heading", {
      name: /make your next career move with confidence/i,
    });
    const footer = container.querySelector("footer");

    expectInDocumentOrder([
      hero,
      features,
      howItWorks,
      pricingPreview,
      socialProof,
      closingCta,
      footer as HTMLElement,
    ]);
  });
});

describe("Landing page icons (Req 5.4, 5.5)", () => {
  it("renders icons as SVG elements", () => {
    const { container } = renderWithTheme(<Home />);
    // Icons throughout the page are SVG (feature cards, step cards, CTAs, etc.).
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

  it('"See pricing" navigates to the pricing page', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Home />);

    const seePricing = screen.getAllByRole("button", {
      name: /^see pricing$/i,
    })[0];
    await user.click(seePricing);

    expect(pushMock).toHaveBeenCalledWith("/pricing");
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
      /command center/i
    );
  });
});
