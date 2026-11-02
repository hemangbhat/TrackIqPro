import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry-options";

// Browser error monitoring. Does nothing unless NEXT_PUBLIC_SENTRY_DSN is set.
// No session replay: it would record what users type into their notes.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
