# Repair 17 handoff — In-Class Draft Ticket

## Status: PASS

Release candidate `f6ac9925defdf5d41442543c7f3e9ede176458c8` is live at <https://in-class-draft-ticket.sociobot.in>. `/health` reports that full SHA and `storage_backend: "sqlite"`. Container App revision `sf-in-class-draft-ticket--0000058` is the sole active revision, is healthy, and has one ready replica.

Immutable image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:f6ac9925defd`
Image digest: `sha256:506bfb35a8e05d047643c4eb4a2e3678eece3b134ea6fc1a67522564996cccfa`

## Failure reproduced and root cause

Before editing, a disposable SQLite fixture held `BEGIN EXCLUSIVE` beyond the configured three-second busy timeout. Candidate `0207da79fb9bdc69d63b379bd26b05cf32eab640` exited during migration with the same verifier error: `(code: 5) database is locked`.

The first repair candidate extended retry coverage from pool connection through migration. Local contention recovered, but scoped revision logs from `sf-in-class-draft-ticket` showed every retry still received code 5 on Azure Files. No second SQLite revision was active. The mounted SMB share was retaining SQLite's default POSIX byte-range lock, so waiting alone could not repair startup.

The final repair selects bundled SQLite's `unix-dotfile` VFS, which uses atomic lock-directory creation on the mounted filesystem. It keeps rollback-journal mode, a single connection, the existing cross-process application file gate, bounded busy retries, and the one-replica contract. The same database remains `/data/tickets.db`; no database was inspected, replaced, or removed.

## Code and regression coverage

- `src/db.rs` retries connection and migration lock failures together, recognizes SQLite busy/locked codes, logs retry attempts, selects `unix-dotfile`, and explicitly rejects WAL on the mounted share.
- `startup_waits_for_mounted_database_lock_instead_of_exiting` holds the mount-safe SQLite lock beyond the old timeout, proves startup remains alive, releases the lock, and verifies the schema opens successfully.
- The release contract requires the mount-safe VFS and rollback journal.
- The source scan now excludes `.factory` verification evidence, which necessarily quotes historical backend failures, while continuing to scan all source and packaging inputs.
- The free-capacity claim now stays below the separately tested ingress rate window, then races 15 concurrent requests for the final 10 slots. Local parallel projects and live ingress both prove exactly 40 created tickets and five capacity conflicts.

## Local verification

Run on 30 August 2026 UTC from a clean `npm ci`:

```sh
npm test                                      # 14 contracts; 58 Playwright tests
cargo test --all-targets --all-features       # 9 passed
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
npx tsc --noEmit
npm run build                                 # dist/ produced
cargo build --release
npm audit --omit=dev --audit-level=high       # 0 vulnerabilities
bash -n deployment/deploy.sh
```

Every command in `.factory/claims.json` passed independently. The lock regression also passed in isolation. `/opt/fleet/lib/verify-url.sh` passed the demo at desktop and 390px with no console errors, one h1, `lang=en`, a main landmark, complete alt text, and labelled controls. Evidence is under `.factory/evidence-repair-17/local-url/`.

The 58-test browser suite covers desktop and mobile Chromium, keyboard focus, touch targets, all public routes, axe serious/critical checks, 200% text reflow, reduced motion, request privacy, demo isolation/reset, API errors, service-worker update, and offline reload.

## Packaging and live verification

- Built from a clean Git archive with the full SHA supplied as `BUILD_SHA`; no `.git` directory or secret entered the image.
- Deployment changed only `sf-in-class-draft-ticket` through `deployment/deploy.sh`.
- Applied template: active revision mode `Single`, min/max replicas `1/1`, only `PORT=8080`, no runtime secrets, and product storage `sf-in-class-draft-ticket-data` mounted at `/data`.
- Twenty uncached health samples before and after restart returned candidate SHA `f6ac9925defdf5d41442543c7f3e9ede176458c8` and `storage_backend: sqlite`.
- Live E2E passed demo provisioning, three seeded tickets, teacher/student reads, CSV formula neutralization, authorization, deletion, and the 40 req/s boundary with `429` plus `Retry-After: 1`.
- A real session was created before `az containerapp revision restart`. The gate rejected responses from the old process, then observed a new process and read the same session through both student and authenticated teacher routes before deleting the fixture.
- The complete live Playwright suite passed: 58/58 across desktop and mobile, including all registered browser claims and 390px 200% reflow.
- Live `verify-url.sh` passed with no console errors. Evidence, health headers, topology, replica status, and screenshots are under `.factory/evidence-repair-17/live-url/`.
- Live mobile Lighthouse: performance **99**, accessibility **100**, LCP **1.5 s**, CLS **0.06**, TBT **80 ms**, speed index **1.2 s**. Report: `.factory/evidence-repair-17/lighthouse-mobile.json`.
- Bundle sizes remain within budget: JS 63.06 kB raw / 22.87 kB gzip; CSS 16.12 kB raw / 4.30 kB gzip; fonts 118,264 bytes; hero WebP 46,170 bytes.

## Known gaps and next steps

No release-blocking gap remains. Independent verification should use candidate `f6ac9925defdf5d41442543c7f3e9ede176458c8` and the live evidence above.
