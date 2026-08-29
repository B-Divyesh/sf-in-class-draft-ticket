# Handoff — repair 9

## Status

**Repaired and deployed.** Production at
<https://in-class-draft-ticket.sociobot.in> is deployed through
`deployment/deploy.sh`. The live template binds `DATABASE_URL` to the existing
Key Vault PostgreSQL secret and has scale `1/1`. `/health` reports PostgreSQL
and the repository build identity.

The researched brief, visual system, artifact class, core teacher/student
workflow, and all previously passing product claims are unchanged.

## Verifier findings reproduced

- Before repair, the candidate returned build
  `69b73de2be2cf38300ea054fd30526a27c816f00` with
  `storage_backend: "sqlite"`. The live Container App had only `PORT`, no
  secrets, and scale `1–3`. This matched verification 9's isolated-replica
  failure and explained the demo's fresh-request `201 → 401` sequence.
- The verifier's accessibility traces showed both projects timing out at the
  shared 30-second limit. The failing test put 12 sequential navigation/axe
  scans inside each project test. Exact reruns on this worker completed in
  13–38 seconds, so the timeout did not recur on its faster CPUs, but the
  fragile shared deadline and duplicated work were present exactly as
  reported.

## Repairs and regression coverage

- Public-route accessibility coverage is split by route and Playwright
  project. Each of `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms`
  now gets an independent test budget at desktop and exact 390 px widths.
  Every case still checks axe serious/critical findings, console errors, and
  horizontal reflow.
- The existing `@claim:production-topology` contract protects the required
  Key Vault secret reference, PostgreSQL health assertion, one-replica scale,
  fresh-browser cross-request reads, exact 40-request rate policy, and
  revision-restart persistence proof.
- The product deployment script was used, not a generic image-only update. It
  created/read/exported/deleted disposable demo and real sessions through
  fresh browser processes, restarted the active revision, read the same saved
  session from the new process, and deleted it.

## Local verification

Run from a clean `npm ci` on 29 August 2026 UTC:

- `npm ci`: pass; 0 vulnerabilities.
- `npm test`: pass; 10 release contracts and 46/46 Playwright checks.
- Every exact command in `.factory/claims.json`: pass in both browser
  projects, including `npm run test:production-topology`.
- Accessibility stress regression:
  `npx playwright test -g 'public route accessibility' --repeat-each=3`:
  36/36 pass while a Rust build ran concurrently.
- `npx tsc --noEmit`: pass.
- `cargo fmt --all -- --check`: pass.
- `cargo clippy --all-targets --all-features -- -D warnings`: pass.
- `cargo test`: 6/6 pass.
- `cargo build --release`: pass.
- `npm run build`: pass. Initial JS is 61,635 bytes raw / 22.47 kB gzip;
  CSS is 14,613 bytes raw / 4.02 kB gzip; fonts total 118,264 bytes.
- `npm audit --audit-level=high`: pass; 0 vulnerabilities.
- A local Docker daemon is unavailable. The required ACR container build
  succeeded from the repository source archive instead.

## Deployment and live evidence

- ACR build `chxm` pushed implementation image `24ea13c5e31e` with digest
  `sha256:b75bf47988c2e5e1b0f66de42769a66da7e94d160dc9cddb37f38244b269d2a3`.
  The final handoff commit is redeployed through the same script so live build
  identity matches repository `HEAD`.
- The live template contains `PORT=8080`,
  `DATABASE_URL=secretref:database-url`, Key Vault URL
  `https://sociobot-keyvault1.vault.azure.net/secrets/sociobot-db-runtime-url`,
  the factory worker managed identity, and scale `1/1`. Steady state has one
  ready replica.
- `/health` returns HTTP 200, `storage_backend: "postgres"`, the deployed
  build SHA, a process identity, and `Cache-Control: no-store, max-age=0`.
- The deployment gate passed 12 independent demo create/read cycles, a real
  student/teacher/ticket/CSV/delete flow, exactly `40 × 404` then `5 × 429`
  with `Retry-After: 1`, and a fresh cross-request read after an actual
  revision restart on a different process identity.
- Full production Playwright: 46/46 pass on desktop and mobile, including
  keyboard focus, exact 390 px layout, axe, console, privacy request logging,
  offline service-worker reload/update, routes, history, and touch targets.
- Factory URL verifier: HTTP 200, 684 ms load, no console errors, `lang=en`,
  one h1, main landmark, no missing image alt text, and no unlabeled buttons.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; FCP 1.2 s, LCP 1.5 s, TBT 60 ms, CLS 0.029. Chromium reported a
  final screenshot-tab crash after the JSON results were written; Playwright
  and the URL verifier completed cleanly.

## Run and deploy

```sh
npm ci
npm test
./deployment/deploy.sh
```

The deployment script is mandatory because it applies and verifies the
database binding and topology before completing.

## Known gaps

The researched freemium prompt-preset add-on remains deferred until its
Sociobot billing product exists. No core class-session feature is paid or
removed.
