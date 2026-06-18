import type { AppProps } from "next/app";
import "../src/app/globals.css";

// The UI runs entirely on the App Router (src/app). The Pages directory is
// used only for API routes, so this _app is intentionally minimal.
export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}
