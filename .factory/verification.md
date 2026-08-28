# Independent product verification — FAIL

- Candidate: `1eb3c1feef1f50e3cc875bd7260ecbab5caf0332`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 28 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-1`
- Result: **FAIL — do not release**

The live service reports the candidate SHA and its HTML, JavaScript, CSS, service worker, and hero asset are byte-identical to the local build. The earlier deployment-identity concern is resolved. The candidate still has four release-blocking product defects.

## Release-blocking findings

### Major — every public deep link returns HTTP 404

Fresh document requests to `/demo`, `/join`, `/start`, `/privacy`, and `/terms` all return HTTP 404. JavaScript then renders the intended screen, but Chromium logs `Failed to load resource: the server responded with a status of 404`. The root page is the only public route returning 200.

This breaks direct-link semantics, the sitemap, link crawling, and the no-console-errors requirement. The local Axum fallback has the same behavior because the SPA file is served as the `not_found_service` response.

```text
/          200
/demo     404
/join     404
/start    404
/privacy  404
/terms    404
```

### Major — PWA installation and offline reload fail

In a fresh Chromium profile, `/sw.js` runs `cache.addAll()` over the public deep links above. Their 404 responses reject service-worker installation. After three seconds there was no registration, no active controller, and only a partial `draft-ticket-v1` cache. With the browser then offline, reloading `/` failed with `net::ERR_INTERNET_DISCONNECTED`.

This fails the required PWA service-worker install/update and offline-reload checks.

### Major — concurrent submissions exceed the advertised 40-ticket cap

After a clean backend restart, 45 simultaneous submissions to one fresh session were sent from distinct client IPs. The API returned 42 `201` responses and three `409` responses; the teacher view contained 42 tickets. The count-before-insert sequence is not atomic.

The sequential `@claim:free-capacity` test passes, but the real concurrency boundary falsifies “Free sessions accept up to 40 tickets.”

### Major — the advertised paid checkout is unavailable

The live “Buy teacher license” link returns HTTP 404 instead of checkout:

```text
GET https://api.sociobot.in/api/v1/products/in-class-draft-ticket/checkout
404 {"error":"enabled factory product","status":404}
```

The page advertises a `$24 one-time purchase`, so this is a broken primary paid path. The `@claim:paid-presets` test mocks only a valid verification response; it does not exercise checkout, price, or purchase completion.

## Other findings

### Medium — available source checks do not all pass

- `npx tsc --noEmit` fails because the committed TypeScript configuration includes Playwright/Vite files without the required Node types and modern disposable library declarations.
- `cargo fmt --all -- --check` fails on `build.rs`, `src/db.rs`, and `src/main.rs`.
- `cargo clippy --all-targets --all-features -- -D warnings` passes.

### Medium — mobile link targets are below 44 px

At 390 px, automated geometry checks found the `Join` and `Start a class` header links at 42 px high and footer links at 22 px high. This conflicts with the 44 px touch-target contract. Axe reports no serious or critical violations.

### Medium — browser Back does not restore scroll position

From `scrollY=2380` on the landing page, internal navigation to Privacy correctly focused its `<h1>`. Browser Back returned to the landing route at `scrollY=0`, not the prior position, contrary to the route-history contract.

### Low — route metadata keeps the home canonical URL

JavaScript updates route titles, but the canonical, Open Graph, and Twitter metadata remain the landing-page values on every SPA route.

## Mandatory claim tests

`.factory/claims.json` exists. Every declared command was run separately before the broader suite, from the demo entry point or a fresh session as specified.

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2 projects |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2 projects |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2 projects |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2 projects |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS sequentially; FAIL under concurrent submissions |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2 projects |
| `paid-presets` | `npm test -- --grep @claim:paid-presets` | PASS mocked verification; live checkout FAILS |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2 projects |

The claim suite is not sufficient to accept the candidate because its free-capacity test omits concurrency and its paid test omits the advertised purchase path.

## First-read and demo gate

**PASS.** On a cold 1440×900 load, the first screen says:

- What it does: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers who need useful evidence of student choices during class.”
- What to click first: “Try it with sample data,” with “See three completed tickets.” beside it.

The action opens `/demo` in one click with three fictional tickets and a persistent “Demo — sample data, nothing is saved to your classes” banner, Reset demo, and Start for real. The 390 px layout remains readable with no horizontal overflow. Screenshots are in `.factory/evidence/live-cold-desktop.png` and `.factory/evidence/live-mobile-390.png`.

## End-to-end product checks

The live core flow works when entered through the rendered SPA:

1. Created a one-day `QA workshop` session.
2. Confirmed one- and two-character student fields are rejected with specific browser validation messages.
3. Corrected all four checkpoints and recorded the ticket as `Silver Oak`.
4. Refreshed the teacher view and found the ticket.
5. Exported CSV with the header plus one data row.
6. Deleted the session and confirmed the code returned 404.

Only `https://in-class-draft-ticket.sociobot.in` was contacted during that core flow. There were no unexpected third-party requests.

API boundary checks passed for exact 80-character class names, 240-character prompts, 40-character nicknames, 280-character checkpoint fields, and 500-character reflections. Too-short inputs, 81-character class names, invalid retention, 501-character reflections, missing teacher tokens, and incorrect teacher tokens returned clear 400/401 errors.

Persistence passed: the release binary started on default port 8080 with no required environment variables, created `./data/tickets.db`, survived graceful shutdown/restart, and returned the previously created session. `/health` returned build identity. Docker was unavailable in the verifier container, so `docker build` could not be executed; the frontend and Rust release stages built independently.

## Rate limiting

- Product API: 45 concurrent requests from one declared client IP produced 40 ordinary responses followed by five `429` responses. `Retry-After: 1` was present, and a request succeeded again after 1.2 seconds. Observed allowance: **40 requests per one-second window per X-Forwarded-For value**.
- Sociobot license verification: 45 concurrent invalid-license checks produced 22 `200` and 23 `429` responses. The 429 response included `Retry-After: 0`. Observed burst allowance in this run: **22**.
- `/health` is intentionally exempt.

## Accessibility, privacy, headers, and performance

- Factory `verify-url.sh` passes on `/`: title, `lang=en`, one `<h1>`, `<main>`, alt text, labeled buttons, and no root-page console errors. Evidence: `.factory/evidence/verification-1/verify.json`.
- Live axe scans across `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` at desktop and 390 px found zero serious or critical violations.
- Keyboard checks passed for form entry, Enter submission, error recovery, and visible 3 px focus outlines. Route changes focus the new `<h1>`.
- Reduced-motion emulation yielded no active animations and computed `scroll-behavior: auto`.
- Live responses include CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS/CSS and font/image assets receive one-year immutable caching.
- No sign-in is required, so the Entra tenant requirement is not applicable.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.4 s, LCP 1.7 s, TBT 110 ms, CLS 0.029.
- Bundles: JavaScript 23,782 bytes gzip; CSS 3,934 bytes gzip; fonts 118,264 bytes total; hero WebP 46,170 bytes. All declared budgets pass.
- `npm audit --audit-level=high`: zero vulnerabilities.

## Local command results

```text
npm ci                                            PASS
npm test                                          PASS (22/22)
npm run build                                     PASS; dist/ produced
npx tsc --noEmit                                  FAIL
cargo fmt --all -- --check                        FAIL
cargo clippy --all-targets --all-features -- -D warnings  PASS
cargo test --all-targets --all-features           PASS (2/2)
cargo build --release                             PASS
npm audit --audit-level=high                      PASS (0 vulnerabilities)
docker build                                      NOT RUN (Docker unavailable)
```

## Release decision

**FAIL.** Do not release until deep links return 200, the service worker installs and reloads offline, the 40-ticket cap is atomic under concurrency, and the paid checkout works. Re-run the complete claim suite and independent live checks after repair.
