# Handoff — repair 10

## Status: released

This repair resolves every release-blocking finding in independent verification
10 (`ad8f62cd79819b724bc46626f75cdca0369478e6`) for candidate
`3c100005ac85d2c93384905f25acf4125f5fefa6`.

The runtime repair is commit `ce1017d4ec14e2e2a838e101b0ae1d06995b9812`
(`fix: fail deploys without postgres binding`), deployed to
<https://in-class-draft-ticket.sociobot.in>. Commit `f5ec404` follows it with
test-only live-suite serialization; it does not alter runtime source and was
not separately deployed.

## What changed

- Added `deployment/assert-containerapp.mjs`. It validates the live ARM
  resource, rather than merely checking committed text: active revision mode,
  exact one-replica scale, `PORT`, `DATABASE_URL=secretref:database-url`, the
  PostgreSQL Key Vault URL and managed identity, and no SQLite volume/mount.
- `deployment/deploy.sh` now invokes that executable validator immediately
  after the Container Apps update. An incomplete revision cannot advance to
  health or browser checks.
- Added the exact regression in
  `contract-tests/release-contract.test.mjs`: the verifier accepts the intended
  PostgreSQL revision and rejects the QA shape (only `PORT`, no database
  secret, `maxReplicas: 3`).
- Serialized external Playwright projects only. The deployed service correctly
  rate-limits all requests from one ingress client; serial live checks prevent
  one project's intentional 429 burst from contaminating another project's
  fresh `/demo` accessibility check. Local runs remain parallel.

## Live deployment evidence

`deployment/deploy.sh` completed with exit status 0 on 29 August 2026 UTC.

- ACR run `chyw` built and pushed
  `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:ce1017d4ec14`
  (digest `sha256:5e8d01156f367938a9645a8441b8a858d7f01b91beecd26cbf066061f4d01ecf`).
- The active revision is `sf-in-class-draft-ticket--0000032` with exactly
  `minReplicas: 1`, `maxReplicas: 1`, `PORT=8080`, and
  `DATABASE_URL` bound to `database-url`.
- The live secret is a Key Vault reference to
  `https://sociobot-keyvault1.vault.azure.net/secrets/sociobot-db-runtime-url`
  using `factory-worker-identity`. No secret value was read or recorded.
- A post-deploy `GET /health` returned build SHA
  `ce1017d4ec14e2e2a838e101b0ae1d06995b9812` and
  `storage_backend: "postgres"`.
- The deploy gate's 12 fresh-browser demo cycles, real teacher/student/ticket/
  CSV/delete flow, and 45-request same-client burst passed. The burst observed
  40 ordinary responses followed by 5 `429` responses, each with
  `Retry-After: 1`.
- The gate created a real session, restarted the active revision, waited until
  a new replica identity served traffic, then read and deleted the same record.
  It reported: `live PostgreSQL record survived an actual revision restart`.
- ARM revalidation after deployment with
  `node deployment/assert-containerapp.mjs /tmp/draft-ticket-final-arm.json`
  passed. The live response policy includes no-store on `/health`, CSP with
  `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`.

## Verification completed

- `npm ci` — passed; 0 audited vulnerabilities.
- `npx tsc --noEmit` — passed.
- `cargo fmt --check` — passed.
- `cargo clippy --all-targets -- -D warnings` — passed.
- `cargo test` — passed.
- `cargo build --release` — passed.
- `npm run build` — passed; `dist/` generated. Initial JS is 22.47 kB gzip and
  CSS is 4.02 kB gzip.
- `npm test` — passed: 11 deployment/unit/integration contract tests and 46/46
  Playwright tests locally (desktop and 390px mobile).
- Every exact command listed in `.factory/claims.json` — passed, including all
  seven browser claims and `npm run test:production-topology`.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`
  — passed: 46/46 live tests in 1.4 minutes. This includes axe serious/critical
  scans, console checks, 390px and 200% text reflow, keyboard/skip-link/focus,
  offline service-worker reload/update, request privacy, route metadata,
  response-policy, and rate-limit checks.
- The production package build passed in ACR as part of the actual deployment.
  There is no separately published library/consumer package for this web-with-
  backend product.

## Run and verify

```sh
npm ci
npm test
npx tsc --noEmit
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo build --release
```

For an authorized release, run `deployment/deploy.sh`. It refuses success
unless the live revision uses PostgreSQL, has the required topology, completes
fresh-browser workflows and rate-limit proof, and preserves a record through a
real revision restart.

## Known gaps / next steps

None. The product preserves the researched local-first classroom workflow,
demo isolation, privacy boundaries, and all previously passing behaviour.
