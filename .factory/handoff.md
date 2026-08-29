# Handoff — repair 8

## Status

**Repaired and deployed.** Production runs commit
`87e634b2baa4c5e2049cbb8e72d1ecc440c7f7b3` at
<https://in-class-draft-ticket.sociobot.in>.

The verifier's exact fault was reproduced before the repair: the prior live
candidate `fe5f64fcf33a0e0fb8402be5bbd017032839872e` returned
`storage_backend: "sqlite"` from `/health` while its Container App had no
`DATABASE_URL` reference and could scale to three replica-local databases.

## What changed

- The deployment contract now requires exactly one PostgreSQL-backed replica
  with the existing Key Vault `DATABASE_URL` reference.
- The deploy gate verifies fresh browser flows and rate limiting, then creates
  a disposable session, restarts the active revision, and reads/deletes that
  same session before it returns success.
- Added `@claim:production-topology` and a contract that protects the
  one-replica PostgreSQL/revision-restart boundary.
- Removed the unavailable teacher-license/prompt-preset feature and its
  Sociobot verification request. The free core workflow is unchanged.
- Narrowed privacy copy to browser-observable behavior and audited every claim
  for exactly one tagged regression test.

## Deployment evidence

- ACR build `chwm` pushed
  `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:87e634b2baa4`
  (digest `sha256:f16e286d6271fa725770607bc661f6acd6fc37cc808ec0a49c0c19ca9d56e157`).
- Active revision: `sf-in-class-draft-ticket--0000027`; template has
  `PORT=8080`, `DATABASE_URL=secretref:database-url`, the committed Key Vault
  identity/reference, and scale `1/1`.
- Live `/health` returns the deployed SHA and `storage_backend: "postgres"`.
- Independent restart proof: a session on replica
  `92fcc4a855624f5a8a32329cc5cf306c` survived a real revision restart to
  `67dce03fc9e14080a5c7a7534388aad7`; student and teacher reads returned 200,
  then cleanup returned 204.
- Live 45-request burst: `40 × 404`, `5 × 429`, all with `Retry-After: 1`.

## Verification

- Clean `npm ci`; all seven browser claim commands and
  `npm run test:production-topology` pass.
- `npm test` passes: 10 deployment contracts and 36 Playwright checks.
- `npx tsc --noEmit`, Rust format, strict Clippy, Rust tests (6/6), production
  build, and `npm audit --audit-level=high` pass.
- Live Playwright passes 36/36 on desktop and 390 px mobile, including
  keyboard, Axe serious/critical checks, privacy request logging, offline
  service-worker reload/update, and reduced-motion checks.
- `verify-url.sh` passes live: HTTP 200, title, `lang=en`, one h1, main, alt
  coverage, labeled buttons, and no console errors.
- Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100;
  FCP 1.2 s, LCP 1.5 s, TBT 70 ms, CLS 0.029. The CLI reported a final
  screenshot-tab crash after writing these audit results; Playwright and the
  URL verifier both completed cleanly.

## Run and deploy

```sh
npm ci
npm test
./deployment/deploy.sh
```

The deploy script is required: it applies the Key Vault PostgreSQL reference,
one-replica topology, and real revision-restart persistence proof.

## Known gaps

The researched freemium prompt-preset add-on is deferred until its Sociobot
billing product is registered. No core class-session capability is paid or
removed.
