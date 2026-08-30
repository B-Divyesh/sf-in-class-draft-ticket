# Independent verification 20 — In-Class Draft Ticket

## Verdict: FAIL

Candidate `0207da79fb9bdc69d63b379bd26b05cf32eab640` is buildable and passes its complete local test suite, but it is not the build serving <https://in-class-draft-ticket.sociobot.in>. The candidate Container App revision cannot start against the mounted `/data` database. Production continues to serve an older PostgreSQL revision, so the required live SQLite deployment and live build identity are not satisfied.

Verified on 30 August 2026 UTC. No product code was changed. Cloud inspection was limited to `sf-in-class-draft-ticket`; no forbidden service, database, vault, app settings, secrets, or unrelated resource was read, connected to, modified, or restarted.

## Release-blocking findings

### Critical — the candidate revision crash-loops and the live URL serves the wrong build and storage backend

- `GET /health?verify=20` returned HTTP 200 with `Cache-Control: no-store, max-age=0`, but its body was `build_sha: b0ce723b11f00169f5ca2cab5c00776d5ad22569` and `storage_backend: postgres`.
- The required candidate is `0207da79fb9bdc69d63b379bd26b05cf32eab640` with SQLite.
- Live assets are also different: live loads `index-DNoktNzH.js` and `index-CDo2Ou3X.css`; the clean candidate build produces `index-JoVE5poV.js` and `index-DwHUVCmD.css`.
- The allowed app configuration points at image `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:0207da79fb9b`, but `latestRevision` is `sf-in-class-draft-ticket--0000056` while `latestReadyRevision` remains `--0000054`.
- Revision `--0000056` is `Unhealthy` / `ActivationFailed`; its one replica was not ready and had restarted 11 times.
- Read-only console logs from that revision report `(code: 5) database is locked`.

The production result is therefore not a deployment-only false alarm: the candidate image was selected, failed activation, and never became the live revision.

### Critical — live one-replica SQLite persistence cannot be proved

The app configuration itself has `minReplicas: 1`, `maxReplicas: 1`, one Azure Files volume mounted at `/data`, only `PORT=8080`, and no secret or Key Vault metadata. That desired state is correct. It does not meet the acceptance contract because the SQLite revision cannot open `/data/tickets.db`; the only ready/live revision reports PostgreSQL. Restarting the stale live revision would not prove candidate SQLite persistence and was not performed.

A controlled local proof did pass with the clean candidate release binary and only `PORT=18090` set:

1. Startup selected `data_dir: /data`, `data_dir_source: durable_mount`, `database: sqlite`, and generated security material.
2. `POST /api/sessions` created session `2Y52VC` and `/data/tickets.db`.
3. The process shut down cleanly and restarted against the same `/data`.
4. Startup reported persisted security material; `GET /api/sessions/2Y52VC` returned HTTP 200 and the original title and prompt.

This proves the source behavior on a normal filesystem, not the failed production mount behavior. Only verifier-created local `/data` files were removed afterward.

### Major — live claim suite fails

Running the candidate's 58-test Playwright suite against the live URL produced **53 passed, 5 failed**:

- Both desktop and mobile `@claim:health-build-identity` runs received `postgres` instead of `sqlite`.
- Both desktop and mobile `@claim:free-capacity` concurrency runs failed the promised exact 40-created/5-rejected result on the stale backend.
- The live `/demo` route reflowed to 411 px in a 390 px viewport at 200% text size.

The same 58 tests pass locally at the candidate commit.

## Mandatory claim gate

`.factory/claims.json` exists with 13 entries. Before broader QA, every listed command was run separately from the candidate and passed:

- `sample-demo`, `csv-export`, `pseudonymous-flow`, `session-retention`, `free-capacity`, `privacy-minimal`, `no-ai-detection-or-authorship-verdict`, `free-no-account-core-flow`, `teacher-control`, and `health-build-identity`: each passed in desktop and mobile Chromium.
- `data-storage-minimization` and `runtime-defaults`: each Rust claim test passed.
- `release-contract`: the exact build plus Node contract command passed.

These are local sandbox results. The live rerun above supersedes them for release readiness.

## First-read and demo test

PASS for copy and discoverability at 1440×900 and 390×844.

- What it does: **“Record in-class drafting without surveillance.”**
- For whom: **“For writing teachers recording student choices during class.”**
- First click: **“Try it with sample data”**, followed by **“See three completed tickets.”**

The action is visible without scrolling. In a fresh 390 px browser it opened `/?demo=1`, displayed the persistent “Demo — sample data, nothing is saved” banner, featured the completed “Blue Finch” ticket, and rendered three sample tickets in 862 ms. Evidence: [first-read desktop](evidence-20/first-read-desktop-fresh.png), [first-read mobile](evidence-20/first-read-mobile-fresh.png), and [settled mobile demo](evidence-20/demo-mobile-settled-fresh.png).

## Clean checkout and build gates

A detached clean worktree at the exact candidate received a fresh `npm ci` and passed:

- `npm test`: 14 contract tests and 58 Playwright tests; all passed.
- `cargo test`: 8 passed.
- `cargo clippy --all-targets --all-features -- -D warnings`.
- `npx tsc --noEmit`.
- `npm run build`: produced `dist/`.
- `cargo build --release`.
- `cargo fmt --all -- --check`.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- `bash -n deployment/deploy.sh`.

The suite covers normal teacher/student completion, CSV export, 1/7/30-day boundaries, a concurrent 40-ticket boundary, invalid credentials, missing sessions, field validation, preserved form data after a 503, delete/read protection, direct links, back navigation, and demo reset/isolation.

## Security and storage reference verification

- The repository-wide registered contract scan passed.
- A separate scan of deployable/runtime source, Docker inputs, migrations, generated `dist`, and the locally built release binary found no contiguous `sociobot-db`, `sociobot-v2`, `sociobot-keyvault1`, `DATABASE_URL`, PostgreSQL URL, or shared-PostgreSQL reference.
- The only app inspected in Azure was `sf-in-class-draft-ticket`. Its current template has only `PORT=8080`, no `secretRef`, no configured secrets/Key Vault metadata, `/data` mounted from `sf-in-class-draft-ticket-data`, and scale 1..1.
- A direct read-only filesystem scan inside the candidate container was attempted, but the crash-looping pod rejected exec with `ClusterExecFailure`. No registry or unrelated resource was inspected as a workaround. The image's configured environment is clean and its observable startup reaches SQLite before failing on the database lock.
- The live health response is nevertheless explicit evidence that the public service still uses a PostgreSQL backend, which is a release blocker.

## Privacy, headers, rate limiting, PWA, and accessibility

- Fresh cold-page request logs used only `https://in-class-draft-ticket.sociobot.in`; no analytics or third-party request occurred. The local privacy claim additionally typed every field without a request or storage mutation and observed exactly one same-origin submit.
- Live and local pages returned CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Health is `no-store`. Hashed JS/CSS are `public, max-age=31536000, immutable`.
- After a fresh window, a live 60-request API burst returned 40 ordinary responses and 20 × 429. Every 429 had `Retry-After: 1`. Observed allowance: **40 requests per one-second window per client**.
- Local and live route scans found no serious/critical axe violations or console/page errors. The clean candidate passed keyboard skip-link/focus, visible focus, 390 px touch targets, reduced-motion, 200% reflow, and one-h1/landmark checks. The stale live demo has the 200% reflow defect noted above.
- Service-worker installation/update and offline reload passed locally and live.
- `/opt/fleet/lib/verify-url.sh` passed locally and live. Reports and screenshots are in [evidence-20](evidence-20/).

## Performance and bundle budgets

Mobile Lighthouse on the clean local candidate: performance **99**, accessibility **100**, LCP **1.9 s**, CLS **0.06**, TBT **40 ms**. The stale live service scored performance **99**, accessibility **100**, LCP **1.5 s**, CLS **0.06**, TBT **100 ms**.

Candidate artifacts remain within budget: JS 63,067 bytes raw / 22.87 kB gzip; CSS 16,120 bytes raw / 4.30 kB gzip; fonts 118,264 bytes total; hero WebP 46,170 bytes.

## Required next action

Do not release. Repair the candidate's SQLite locking behavior on the mounted `/data` Azure Files volume without introducing any external database or secret. Deploy a new immutable candidate only to `sf-in-class-draft-ticket`, require it to become the sole ready revision, then prove build identity, `storage_backend: sqlite`, one ready replica, and the same API record before and after a controlled revision restart.
