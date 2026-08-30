# Independent product verification 19 — FAIL

- Candidate commit: `b0ce723b11f00169f5ca2cab5c00776d5ad22569`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 30 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-19`
- Decision: **FAIL — the public product works, but the latest deployment is unhealthy and the claim registry is incomplete.**

No product code was changed.

## Release-blocking findings

### Blocker — latest Azure revision is unhealthy and violates the deployment contract

The public URL currently serves the candidate from healthy revision
`sf-in-class-draft-ticket--0000054`. Twenty fresh, cache-busted health requests
all returned HTTP 200, build SHA `b0ce723b11f00169f5ca2cab5c00776d5ad22569`,
and `storage_backend: postgres`.

That healthy public result hides a later failed rollout. A fresh Azure control-plane
read showed:

- `latestRevisionName`: `sf-in-class-draft-ticket--0000055`
- `latestReadyRevisionName`: `sf-in-class-draft-ticket--0000054`
- revision `0000055`: active, **Unhealthy**, image tag `b0ce723b11f0`
- revision `0000055` environment: `PORT` only; `DATABASE_URL` is absent
- revision `0000055` scale: minimum 1, maximum 3
- revision `0000054`: Healthy, one running replica, PostgreSQL configured

The candidate contract requires the requested revision to be ready, PostgreSQL to
be bound, and scale 1/1. Running the repository's own
`assertContainerAppContract` against current Azure state exits 1:

```text
AssertionError: the requested revision sf-in-class-draft-ticket--0000055 is not ready;
traffic remains on sf-in-class-draft-ticket--0000054
```

This is the same unsafe generic deployment shape addressed by the candidate. The
backend correctly refuses to start it instead of silently using replica-local
SQLite, but the latest release attempt is still failed. Release acceptance requires
repairing the live template and making the latest revision healthy.

### Major — claim-like README statements are not registered claims

All ten entries in `.factory/claims.json` have passing tests, but the required
landing/README cross-check found observable statements with no corresponding claim
entry and tagged sandbox test. Examples include:

- the server creates `./data/tickets.db` without configuration;
- the container needs no configuration beyond `PORT` and uses SQLite without
  `DATABASE_URL`;
- `/health` returns the build SHA;
- session codes contain six characters;
- the release command rejects dirty/unpushed source, takes 20 identity samples,
  and checks persistence.

Some are covered by ordinary Rust or release-contract tests, but they are not in
`.factory/claims.json` and therefore do not meet the attached claims contract. The
privacy page's quantitative “deleted within four seconds” rate-counter statement is
also broader than the wording of its registered claim. This cross-check failure is
release-blocking under the work order.

## Mandatory first gates

### Cold first read — PASS

The first 1440×900 screen says:

- what: “Record in-class drafting without surveillance”;
- for whom: “For writing teachers recording student choices during class”;
- first click: “Try it with sample data,” with “See three completed tickets.”

One click opened `/?demo=1`, whose persistent banner says “Demo — sample data,
nothing is saved to your classes” and offers **Reset demo** and **Start for real**.
The first demo viewport showed a completed Blue Finch ticket. The 390×844 first
screen also contained all three required facts and the primary action.

Evidence:

- `verification-artifacts-19/live-cold-desktop.png`
- `verification-artifacts-19/live-demo-desktop.png`
- `verification-artifacts-19/live-cold-mobile-390.png`
- `verification-artifacts-19/live-demo-mobile-390.png`

### Every declared claim test — PASS (10/10)

After `npm ci`, every exact command in `.factory/claims.json` was run separately
from the clean candidate checkout:

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS — 2 browser projects |
| `csv-export` | PASS — 2 browser projects |
| `pseudonymous-flow` | PASS — 2 browser projects |
| `session-retention` | PASS — 2 browser projects |
| `free-capacity` | PASS — 2 browser projects |
| `privacy-minimal` | PASS — 2 browser projects |
| `data-storage-minimization` | PASS — 1 Rust test |
| `no-ai-detection-or-authorship-verdict` | PASS — 2 browser projects |
| `free-no-account-core-flow` | PASS — 2 browser projects |
| `teacher-control` | PASS — 2 browser projects |

## Clean local verification

All available code gates passed:

```text
npm ci                                      PASS — 50 packages, 0 vulnerabilities
npm test                                    PASS — 16 contract + 58 Playwright tests
npx tsc --noEmit                            PASS
cargo fmt --all -- --check                  PASS
cargo clippy --all-targets --all-features -- -D warnings
                                            PASS
cargo test                                  PASS — 9/9
cargo build --release                       PASS
npm run build                               PASS — dist/ produced
npm audit --omit=dev --audit-level=high     PASS — 0 vulnerabilities
bash -n deployment/deploy.sh                PASS
node --check deployment/verify-live*.mjs    PASS
```

The release binary was also started in a fresh temporary directory with an empty
environment except `PATH` and `PORT`. `/health` returned SQLite/dev identity, startup
logging reported generated security material without exposing it, SIGTERM produced
the graceful-shutdown log, and one ticket persisted after a process restart. On the
second start the security material was reported as persisted.

The container engine is unavailable in this verifier image (`docker: command not
found`; no Podman/Buildah), so a local `docker build` could not be run. The exact
frontend and optimized backend stages passed independently, and the SHA-bound image
is observable in the live control plane.

## End-to-end behavior and boundaries

`PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npm test` passed all
58 tests. `/opt/fleet/lib/verify-url.sh` also passed with HTTP 200, title, `lang=en`,
one h1, one main landmark, complete image alt text, labeled buttons, and no browser
errors.

An independent live browser flow used only the keyboard to:

1. create a one-day class session;
2. enter a three-character invalid code and receive the actionable six-character
   error;
3. correct the code and open the student ticket;
4. submit all four drafting checkpoints;
5. open the private teacher link in a fresh browser context and read the ticket.

The token was removed from the URL after import and stored only under the scoped
`teacher:<code>` key. Unauthenticated teacher access returned 401. The session was
deleted after the check.

Independent API boundary results:

- 2-character title, 4-character prompt, and 1-day retention: 201;
- 80-character title, 240-character prompt, 30-day retention: 201;
- 40/280/280/280/500-character ticket fields: 201;
- 41-character nickname, 81-character title, 241-character prompt, whitespace-only
  title, and retention 2: 400;
- lowercase form of a valid code: 200;
- 40 simultaneous ticket writes: 40×201, then exactly 40 persisted.

The repository's separate live browser verifier passed demo, CSV formula
neutralization, delete, rate limit, and fresh-process checks across the one ready
replica.

## Accessibility, mobile, and resilience

- Builder suite axe scans: zero serious/critical findings on `/`, `/demo`, `/join`,
  `/start`, `/privacy`, and `/terms` in desktop and mobile projects.
- Independent axe scan of the authenticated teacher view: zero serious/critical.
- Keyboard focus starts on the skip link with a visible
  `rgb(49, 94, 168) solid 3px` outline.
- Route changes focus the new h1; forms, select, submit, and invalid-code recovery
  were keyboard operable.
- At 390 px there was no horizontal overflow; all visible interactive targets in
  the demo measured at least 44×44 CSS px.
- The full suite passed 200% text reflow on every public route.
- With reduced motion, the media query matched and no element retained a nonzero
  transition or animation duration.
- Console errors and uncaught page errors: zero in independent desktop/mobile flows.
- Every discovered internal/external link returned 200; `mailto:` was exempt.
- The real 404 response is HTTP 404 and retains shared navigation, metadata, and
  legal links.

## Privacy, headers, and rate limiting

Independent request logs through the demo and real teacher/student flow contained
only `https://in-class-draft-ticket.sociobot.in`. There were no analytics, tracking,
media-capture, sign-in, payment, or AI requests. Demo storage contained only
`demo:workspace`; the real workflow used only its scoped teacher token key.

Live responses include response-header CSP with `frame-ancestors 'none'`,
`X-Content-Type-Options: nosniff`, and
`Referrer-Policy: strict-origin-when-cross-origin`. HTTP redirects to HTTPS with 301.
`/health` uses `Cache-Control: no-store, max-age=0`. Hashed JS/CSS and fonts use
`public, max-age=31536000, immutable`.

A separate 50-request API burst returned exactly 40 ordinary responses and 10
HTTP 429 responses. Every 429 included `Retry-After: 1`. Observed allowance: **40
API requests per client per one-second window**. `/health` remained exempt and
returned 200 immediately afterward.

No sign-in exists, so the Entra authority requirement is not applicable.

## PWA and performance

The service worker registered and updated successfully, its active state was
`activated`, and cache `draft-ticket-v3` existed. After switching the browser
offline, a reload rendered the application shell and its explicit offline notice.

Production asset sizes:

- JavaScript: 63,067 bytes raw / 22,554 bytes gzip;
- CSS: 16,053 bytes raw / 4,272 bytes gzip;
- fonts: 118,264 bytes total;
- hero WebP: 46,170 bytes;
- social card: 41,516 bytes, 1200×630.

Fresh mobile Lighthouse:

| Category/metric | Result |
| --- | ---: |
| Performance | 97 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1.2 s |
| LCP | 1.5 s |
| TBT | 160 ms |
| CLS | 0.06 |
| Total transfer | 139 KiB |

Evidence: `verification-artifacts-19/lighthouse-mobile.json` and
`verification-artifacts-19/live-mobile-offline.png`.

## Defects by severity

| Severity | Finding |
| --- | --- |
| Blocker | Latest requested Azure revision `0000055` is unhealthy; traffic remains on `0000054`. Its template omits `DATABASE_URL` and allows max 3 replicas, so the repository's deployment assertion fails. |
| Critical | None. |
| Major | Observable README/runtime statements are absent from `.factory/claims.json`; the required unlisted-claim cross-check therefore fails. |
| Minor | None. |

## Required next actions

1. Reapply the repository deployment contract so the newest revision is healthy,
   contains the PostgreSQL secret reference, uses scale 1/1, and becomes both
   `latestRevisionName` and `latestReadyRevisionName`.
2. Re-run `assert-containerapp.mjs`, the 20-sample identity check, live browser
   verification, and restart-persistence gate after deployment.
3. Add claim entries with exactly one tagged sandbox test for the unlisted README
   promises, or remove/rephrase those promises.
