import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Same env files as `next start`, so tests can tell whether real Clerk keys exist.
loadEnvConfig(process.cwd());

// End-to-end tests against a production build (`npm run build` first).
// Files are named *.e2e.ts so Vitest's *.test / *.spec pattern never picks them up.
const PORT = 3100;

export default defineConfig({
    testDir: "./e2e",
    testMatch: "**/*.e2e.ts",
    fullyParallel: true,
    // A single `next start` serves every browser; more workers just cause timeouts.
    workers: process.env.CI ? 2 : 4,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
        command: `npx next start -p ${PORT}`,
        // A static page: CI has no database, so /api/health would never be ready.
        url: `http://localhost:${PORT}/privacy`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
