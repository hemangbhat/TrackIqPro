import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import React from "react";
import { renderWithTheme, screen } from "../test/render";

/**
 * Property 6: Navigation correctness
 *
 * For any route:
 *  - exactly one nav item is rendered active (indigo-filled, aria-current="page")
 *    and it matches the route per the DashboardShell isActive rule
 *    (longest-matching href wins so nested routes don't also light up Overview);
 *  - public routes select the MarketingShell and protected routes select the
 *    DashboardShell (shell-selection invariant, modeled as a pure routing
 *    predicate mirroring middleware.ts since no router component selects the
 *    shell yet).
 *
 * Validates: Requirements 1.1, 1.2, 1.9
 */

// usePathname is the single source of the current route inside DashboardShell.
// Keep the rest of next/navigation real so next/link continues to render.
let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => {
    const actual = await importOriginal<typeof import("next/navigation")>();
    return { ...actual, usePathname: () => mockPathname };
});

// Clerk's UserButton/useUser require an auth context that does not exist in the
// test environment; stub them so the shells render in isolation.
vi.mock("@clerk/nextjs", () => ({
    UserButton: () => null,
    useUser: () => ({ user: null, isLoaded: true }),
}));

import DashboardShell from "./DashboardShell";
import MarketingShell from "./MarketingShell";

// ---------------------------------------------------------------------------
// Reference model of the nav configuration + isActive rule (mirrors the
// implementation in DashboardShell). The test asserts the rendered DOM agrees
// with this independently-computed expectation.
// ---------------------------------------------------------------------------
const NAV = [
    { href: "/dashboard", exact: true },
    { href: "/dashboard/intelligence", exact: false },
    { href: "/dashboard/jobs", exact: false },
    { href: "/dashboard/notes", exact: false },
    { href: "/dashboard/offers", exact: false },
    { href: "/dashboard/settings", exact: false },
];

function refIsActive(pathname: string, href: string, exact: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
}

/** The href the longest-match rule should mark active, or undefined if none. */
function expectedActiveHref(pathname: string): string | undefined {
    return NAV.filter((l) => refIsActive(pathname, l.href, l.exact))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

// ---------------------------------------------------------------------------
// Pure shell-selection predicate, mirroring the public route list in
// middleware.ts. Used to validate the public->Marketing / protected->Dashboard
// invariant.
// ---------------------------------------------------------------------------
function isPublicRoute(pathname: string): boolean {
    if (pathname === "/" || pathname === "/pricing") return true;
    if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) return true;
    if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) return true;
    return false;
}

type ShellChoice = "MarketingShell" | "DashboardShell";
function selectShell(pathname: string): ShellChoice {
    return isPublicRoute(pathname) ? "MarketingShell" : "DashboardShell";
}

/** A router-like component that mounts the shell chosen for the route. */
function RouteShell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
    return selectShell(pathname) === "MarketingShell" ? (
        <MarketingShell>{children}</MarketingShell>
    ) : (
        <DashboardShell>{children}</DashboardShell>
    );
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------
const NAV_HREFS = NAV.map((l) => l.href);
const SEGMENT = fc.constantFrom("a", "b", "123", "edit", "new", "x-y", "nested");

// Arbitrary protected/in-app routes: bare nav hrefs, nav hrefs with nested
// subpaths, and free-form paths that may match no nav item at all.
const routeArb = fc.oneof(
    fc.constantFrom(...NAV_HREFS),
    fc
        .tuple(fc.constantFrom(...NAV_HREFS), fc.array(SEGMENT, { minLength: 1, maxLength: 3 }))
        .map(([href, segs]) => `${href}/${segs.join("/")}`),
    fc
        .array(
            fc.constantFrom("dashboard", "jobs", "notes", "offers", "settings", "random", "foo", "123"),
            { maxLength: 4 }
        )
        .map((segs) => "/" + segs.join("/"))
);

// Arbitrary public-group routes mirroring the middleware public matcher.
const publicRouteArb = fc.oneof(
    fc.constantFrom("/", "/pricing", "/sign-in", "/sign-up"),
    fc.array(SEGMENT, { minLength: 1, maxLength: 2 }).map((s) => `/sign-in/${s.join("/")}`),
    fc.array(SEGMENT, { minLength: 1, maxLength: 2 }).map((s) => `/sign-up/${s.join("/")}`)
);

describe("Property 6: Navigation correctness", () => {
    it("renders exactly one active nav item matching the route per the isActive rule", () => {
        fc.assert(
            fc.property(routeArb, (path) => {
                mockPathname = path === "" ? "/" : path;
                const { unmount } = renderWithTheme(
                    <DashboardShell>
                        <div>content</div>
                    </DashboardShell>
                );
                try {
                    const activeLinks = Array.from(
                        document.querySelectorAll<HTMLAnchorElement>('a[aria-current="page"]')
                    );
                    const expected = expectedActiveHref(mockPathname);

                    // Never more than one active item; exactly one iff a nav
                    // item matches the route.
                    expect(activeLinks.length).toBe(expected ? 1 : 0);

                    if (expected) {
                        expect(activeLinks[0].getAttribute("href")).toBe(expected);
                        // Active item uses the indigo-filled treatment (Req 1.9).
                        expect(activeLinks[0].className).toContain("bg-indigo-600");
                    }
                } finally {
                    unmount();
                }
            }),
            { numRuns: 60 }
        );
    });

    it("selects exactly one shell per route: public->Marketing, protected->Dashboard", () => {
        // Public routes resolve to the MarketingShell.
        fc.assert(
            fc.property(publicRouteArb, (path) => {
                expect(isPublicRoute(path)).toBe(true);
                expect(selectShell(path)).toBe("MarketingShell");

                mockPathname = path;
                const { unmount } = renderWithTheme(
                    <RouteShell pathname={path}>
                        <div>page</div>
                    </RouteShell>
                );
                try {
                    // Marketing chrome present, dashboard chrome absent.
                    expect(screen.queryByLabelText("Open navigation menu")).toBeNull();
                    expect(screen.getAllByText("Get started").length).toBeGreaterThan(0);
                } finally {
                    unmount();
                }
            }),
            { numRuns: 40 }
        );

        // Protected (non-public) routes resolve to the DashboardShell.
        fc.assert(
            fc.property(routeArb, (path) => {
                const p = path === "" ? "/" : path;
                fc.pre(!isPublicRoute(p));
                expect(selectShell(p)).toBe("DashboardShell");

                mockPathname = p;
                const { unmount } = renderWithTheme(
                    <RouteShell pathname={p}>
                        <div>page</div>
                    </RouteShell>
                );
                try {
                    // Dashboard chrome present (drawer-trigger only exists here).
                    expect(screen.getByLabelText("Open navigation menu")).toBeInTheDocument();
                } finally {
                    unmount();
                }
            }),
            { numRuns: 40 }
        );
    });
});
