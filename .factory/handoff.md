# Review 3 handoff

## Status

**FAIL — one blocking verification-contract finding.** The product itself passed the cold first read, one-click demo, live end-to-end suite, copy audit, route crawl, accessibility checks, and ten sandbox-safe claims. `.factory/review-3.md` records the full evidence.

## What was done

- Reviewed the live site cold at 390 × 844 and 1440 × 900.
- Audited every landing-page and README sentence, heading, term, and action.
- Exercised the demo, reset/leave controls, real-data isolation, request boundary, and CSV path.
- Read both earlier reviews, both polish reports, and the previous handoff; verified every F-1 and F-2 repair live and in source.
- Crawled all public links and checked titles, h1s, descriptions, canonicals, Open Graph data, icons, the shared shell, and the designed 404.
- Ran ten sandbox-safe declared claim commands from a clean clone, the full local and live suites, TypeScript, Rust format/clippy/tests/release build, Vite build, and dependency audit.
- Did not modify product code.

## Verification results

```text
Clean clone: /tmp/in-class-review3.OZRLpk/repo
npm test: PASS (13 contract, 56 browser)
Live Playwright: PASS (56 browser)
Sandbox-safe claims: PASS (10/10)
TypeScript: PASS
Rust fmt/clippy/tests/release: PASS (9 tests)
npm audit --audit-level=high: PASS
Vite output: dist/, 22.87 kB gzip initial JS
```

## Known gap and next step

`npm run test:production-topology` was not run because it unconditionally deploys an image, changes Container App configuration, and restarts the live revision. The work order says `deploy: none`, and repository policy forbids infrastructure changes. This leaves `production-topology` untested and makes the verdict FAIL under the claims rule.

Replace that claim with a disposable PostgreSQL restart test, or remove it from the sandbox claims registry and retain the production gate only as SHA-bound release evidence. Then rerun the complete review.
