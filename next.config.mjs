/**
 * Clerk's Frontend API host (e.g. "clerk.example.com" or
 * "foo-bar-12.clerk.accounts.dev"), decoded from the publishable key, which
 * is base64 of "<host>$".
 */
function clerkFrontendApi() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  try {
    const host = Buffer.from(key.split("_")[2] || "", "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

/** Sentry's ingest origin from the browser DSN (https://<key>@<host>/<id>), if set. */
function sentryIngestOrigin() {
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    return dsn ? new URL(dsn).origin : null;
  } catch {
    return null;
  }
}

/**
 * Content Security Policy: an allowlist of where scripts, connections,
 * images and frames may come from, so injected markup can't load code or
 * send data to any other origin.
 *
 * Inline scripts stay allowed: Next.js inlines its hydration data, and the
 * per-request nonce that would remove 'unsafe-inline' forces every page,
 * including the static landing page, to render dynamically. React escaping
 * and the absence of raw-HTML sinks are the defence against inline injection.
 */
function contentSecurityPolicy() {
  const clerk = clerkFrontendApi();
  const clerkHosts = clerk ? [`https://${clerk}`] : [];
  const dev = process.env.NODE_ENV !== "production";
  const directives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      // React's dev overlay and fast refresh evaluate code; production never does.
      ...(dev ? ["'unsafe-eval'"] : []),
      ...clerkHosts,
      "https://challenges.cloudflare.com",
      "https://js.stripe.com",
    ],
    "connect-src": [
      "'self'",
      ...clerkHosts,
      "https://clerk-telemetry.com",
      "https://*.clerk-telemetry.com",
      "https://api.stripe.com",
      // Browser error reports, only when Sentry is configured.
      ...(sentryIngestOrigin() ? [sentryIngestOrigin()] : []),
    ],
    "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "font-src": ["'self'", "data:"],
    "frame-src": ["'self'", "https://challenges.cloudflare.com", "https://js.stripe.com", "https://hooks.stripe.com"],
    "worker-src": ["'self'", "blob:"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** Security headers sent on every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
