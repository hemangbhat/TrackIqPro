# Security notes

How TrackIQ handles known dependency advisories, and the ones that are
accepted for now. CI fails on any high or critical advisory in a dependency
that ships to production (`npm audit --omit=dev --audit-level=high`).

## Accepted advisories

| Advisory | Package | Where it runs | Why it is accepted | Review by |
|---|---|---|---|---|
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (moderate, ReDoS) | `minimatch` 3.1.5 | ESLint only (dev tooling) | No fixed 3.x exists; the fix is 11.x, and forcing it breaks ESLint (`minimatch` 11 has no default export). The patterns it matches come from our own lint config, never from user input, and it never runs in production. The TypeScript parser's copy is already overridden to 11.0.3. | 2027-01-31, or when ESLint moves to `minimatch` 11 |

## Overrides in `package.json`

Each pins a patched transitive version that the parent package hasn't
picked up yet. Remove one when its parent ships the fix.

| Override | Reason |
|---|---|
| `@vercel/cli-config` → `zod` 4.6.7 | Memory exhaustion advisory in older `zod` |
| `next` → `postcss` 8.5.32 | Advisories in the `postcss` that Next pins |
| `hyperid` → `uuid` 11.1.1 | Buffer bounds advisory (dev only, via `autocannon`) |
| `@typescript-eslint/typescript-estree` → `minimatch` 11.0.3 | GHSA-g3hv-75wg-m249 (dev only) |

## Reporting

The Python service is checked with `pip-audit -r ai-service/requirements.txt`.
For an issue in the app itself, open a private security advisory on the
GitHub repository rather than a public issue.
