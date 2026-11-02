import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/pricing",
    "/privacy",
    "/demo(.*)",
    // Link-preview image for shared URLs; crawlers fetch it signed out.
    "/opengraph-image(.*)",
    // Reminder-email unsubscribe works without signing in (signed link instead).
    "/unsubscribe",
    "/api/email/unsubscribe",
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
}, {
    // Same as ClerkProvider in the root layout: send signed-out visitors to our
    // own sign-in page, not Clerk's hosted one on another domain.
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};