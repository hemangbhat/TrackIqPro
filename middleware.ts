import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/pricing",
    "/privacy",
    "/demo(.*)",
    "/api/health",
    "/api/stripe/webhook",
    "/api/clerk/webhook",
    "/api/cron(.*)",
]);

export const middleware = clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        // Must be awaited: protect() is async in Clerk v6, and an un-awaited
        // call lets signed-out visitors through to the page.
        await auth.protect();
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};