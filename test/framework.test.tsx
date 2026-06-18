import { describe, it, expect } from "vitest";
import fc from "fast-check";
import React from "react";
import { renderWithTheme, screen } from "./render";

describe("test framework setup", () => {
  it("runs a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("runs property-based tests via fast-check", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      })
    );
  });

  it("renders a component through the ThemeProvider helper (light)", () => {
    renderWithTheme(<div>hello theme</div>, { theme: "light" });
    expect(screen.getByText("hello theme")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("can force dark mode", () => {
    renderWithTheme(<div>dark content</div>, { theme: "dark" });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("can force prefers-reduced-motion", () => {
    renderWithTheme(<div>reduced</div>, { reducedMotion: true });
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  });

  it("does not report reduced motion by default", () => {
    renderWithTheme(<div>default motion</div>);
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
  });
});
