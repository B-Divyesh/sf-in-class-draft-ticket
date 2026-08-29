# Repair handoff — verification 14 blockers

## Status

The repair is complete pending the final container deployment gate. It preserves the Rust
Axum backend, Vite/Svelte frontend, PostgreSQL production topology, and the
existing teacher and student workflow.

## Fixed release blockers

1. **Deterministic ticket submission.** Student ticket recording no longer
   depends on transient route state or the unrelated page-wide busy flag. The
   form prevents native navigation at the submit boundary, derives its
   six-character session code from the current route if the loaded session is
   briefly unavailable, and announces a clear retry instruction if a submission
   cannot start. It has distinct in-flight state, so a successful ticket POST
   always reaches either the recorded confirmation or a visible error.
2. **Build identity.** `deployment/deploy.sh` builds the checked-out, pushed
   commit with `BUILD_SHA`, waits for `/health` to report that exact SHA and
   `postgres`, and refuses stale or dirty source. The final deployment command
   below is the release identity check for this repair.
3. **Observable production-topology claim.**
   `npm run test:production-topology` now invokes the real deployment gate.
   The gate deploys the current SHA, verifies the applied Container App has one
   ready PostgreSQL-backed replica, creates a disposable session, restarts the
   active revision, then reads and deletes that same session through fresh
   browser processes. It is no longer a source-text inspection. The claim
   sandbox description now states those real prerequisites and observations.

## Regression coverage

- `@claim:privacy-minimal` now waits for and requires exactly the student
  ticket `POST /api/sessions/<code>/tickets` request and a `201` response before
  accepting the success message. It retains the same-origin, no-storage-change,
  and no-media-capture assertions.
- The normal student workflow also asserts the POST/201 boundary before teacher
  readback.
- A new browser regression intercepts a failed ticket request and proves that
  the populated form stays present, the error is announced, and the button can
  be tried again.
- The contract test verifies every listed claim still has exactly one tagged
  test, including the executable live topology gate.

## Local verification

Performed after `npm ci` from this checkout:

```sh
npm run test:contracts                  # 13/13 passed
npx tsc --noEmit                         # passed
npm run build                            # passed; dist/ produced
npm test -- --grep @claim:privacy-minimal # 2/2 desktop/mobile passed
npx playwright test --grep @claim:privacy-minimal --repeat-each=20 --retries=0 # 40/40 passed
npm test                                 # 13 contract tests; 56/56 desktop/mobile browser tests passed
cargo fmt --check                        # passed
cargo clippy --all-targets -- -D warnings # passed
cargo test                               # passed
cargo build --release                    # passed
npm audit --audit-level=high             # 0 vulnerabilities
```

The production build remains 63.01 kB raw / 22.87 kB gzip JavaScript and
16.05 kB raw / 4.29 kB gzip CSS. Existing route accessibility coverage runs
axe on `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` at desktop and
390 px; the complete suite also covers keyboard, 200% reflow, reduced motion,
offline reload, update behavior, privacy request logging, retention, capacity,
authorization, headers, and rate limiting.

## Final release evidence

For the final committed revision containing this handoff, run:

```sh
npm run test:production-topology
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
/opt/fleet/lib/verify-url.sh https://in-class-draft-ticket.sociobot.in/ /tmp/verify-url-repair
```

The first command is also the deployment command. Its success output is exact
release evidence for this revision: it fails unless live `/health` reports the
same committed SHA and PostgreSQL, and unless the created record survives the
actual revision restart.

## Known gaps

Docker and Podman are not installed in this worker image, so an image build
cannot be run locally. The mandatory Azure Container Apps deployment gate
builds the multi-stage image in ACR and verifies the running container before
it returns success.
