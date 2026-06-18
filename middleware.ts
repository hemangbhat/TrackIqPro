import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/pricing",
    "/demo(.*)",
    "/api/health",
    "/api/stripe/webhook",
]);

export const middleware = clerkMiddleware((auth, req) => {
    if (!isPublicRoute(req)) {
        auth.protect();
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};