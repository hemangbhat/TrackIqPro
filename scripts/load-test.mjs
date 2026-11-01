// scripts/load-test.mjs
// Load test the public pages and the health check (which touches MongoDB).
//
//   npm run build && npx next start -p 3000      # in one terminal
//   npm run load-test                             # in another
//   npm run load-test -- --url https://<preview>.vercel.app --allow-remote
//
// Options: --url, --connections (concurrent users, default 100),
// --duration (seconds per route, default 20). Targets other than localhost
// need --allow-remote, so nobody load-tests production by accident; point it
// at a preview deployment instead.

import autocannon from "autocannon";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const base = opt("url", "http://localhost:3000").replace(/\/+$/, "");
const connections = Number(opt("connections", "100"));
const duration = Number(opt("duration", "20"));
const { hostname } = new URL(base);
if (!["localhost", "127.0.0.1"].includes(hostname) && !args.includes("--allow-remote")) {
    console.error(`Refusing to load-test ${hostname} without --allow-remote.`);
    process.exit(1);
}

const routes = ["/", "/pricing", "/demo", "/api/health"];
const rows = [];
let failed = false;

for (const path of routes) {
    process.stdout.write(`${path} … `);
    const r = await autocannon({ url: base + path, connections, duration });
    const errors = r.errors + r.timeouts + r.non2xx;
    if (errors > 0) failed = true;
    rows.push({
        route: path,
        "req/s": Math.round(r.requests.average),
        "p50 ms": r.latency.p50,
        "p97.5 ms": r.latency.p97_5,
        "p99 ms": r.latency.p99,
        requests: r.requests.total,
        errors,
    });
    console.log("done");
}

console.log(`\n${connections} concurrent connections, ${duration}s per route, against ${base}`);
console.table(rows);
process.exit(failed ? 1 : 0);
