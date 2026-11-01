import { expect, test, type Page } from "@playwright/test";

/**
 * Collect anything the browser refused or crashed on. A Content Security
 * Policy that is too tight shows up here as "Refused to load/execute/connect",
 * so every page test doubles as a check that the CSP doesn't break the app.
 */
function watchForProblems(page: Page): string[] {
    const problems: string[] = [];
    page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
        const text = msg.text();
        if (/Content Security Policy|Refused to/i.test(text)) problems.push(`csp: ${text}`);
    });
    return problems;
}

test("landing page renders with no CSP violations or script errors", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The command center for your");
    await page.waitForLoadState("load");
    expect(problems).toEqual([]);
});

test("demo page shows sample data and the labelled AI prep sample", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/demo");
    await expect(page.getByText("exploring TrackIQ with sample data")).toBeVisible();
    await expect(page.getByText("Sample — sign up to prep with your own notes")).toBeVisible();
    // Sample data has no real pages; a dashboard link would bounce visitors to sign-in.
    await expect(page.locator('a[href^="/dashboard"]')).toHaveCount(0);
    await page.waitForLoadState("load");
    expect(problems).toEqual([]);
});

test("pricing and privacy pages render", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByText(/OpenAI and Pinecone/)).toBeVisible();
    expect(problems).toEqual([]);
});

test("an unsubscribe link that was tampered with is refused, and opening it changes nothing", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/unsubscribe?u=user_1&t=forged");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link doesn't work");
    await expect(page.getByRole("button", { name: /unsubscribe/i })).toHaveCount(0);
    expect(problems).toEqual([]);
});

test("the dashboard is not reachable while signed out", async ({ page, baseURL }) => {
    await page.goto("/dashboard/jobs");
    // Our own sign-in page (same origin), not Clerk's hosted one.
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/sign-in/);
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    await expect(page.getByRole("link", { name: "Add job" })).toHaveCount(0);
});

test("the private API rejects anonymous requests", async ({ request }) => {
    const res = await request.get("/api/jobs", { maxRedirects: 0 });
    expect([401, 404, 307]).toContain(res.status());
});

test("every page is sent with the security headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-powered-by"]).toBeUndefined();
});

test("the sign-in page loads Clerk's sign-in form", async ({ page }) => {
    test.skip(
        !/^pk_(test|live)_[A-Za-z0-9]{20,}/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "") ||
            process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k",
        "needs a real Clerk publishable key"
    );
    const problems = watchForProblems(page);
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /continue/i }).first()).toBeVisible({ timeout: 20_000 });
    expect(problems).toEqual([]);
});
