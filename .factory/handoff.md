# Polish 4 handoff

## Status

**PASS — released repair.** The fourth drafting checkpoint is named **exit reflection** everywhere. The free limit now says **40 draft tickets per session** everywhere it appears. The product keeps its paper-ticket/constellation identity and all earlier repairs remain live.

Repair source: `beffeac4bdc7178165888184c318b844addc5295`.

Live deployment: <https://in-class-draft-ticket.sociobot.in>.

Image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:beffeac4bdc7` (`sha256:6e89452d7e689e524f2a83e1a1cfa0dd3ee7b7c3dfb2538f7a4bb3d5778b8678`). ACR run: `ch1b2`.

## What changed

- Landing field lists now end with “exit reflection,” matching the student form, teacher sheet, and README.
- The reflection helper asks what the student will revisit after class.
- The landing fact, terms, README, claim registry, audit, and catalog description now say “Free sessions accept up to 40 draft tickets.”
- Added a browser regression that compares those words across landing, student form, and terms.

## How to run and verify

```sh
npm ci
npm test
cargo test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo build --release
```

Every declared claim is in `.factory/claims.json`. Run each listed command from a fresh clone. The repair was verified from `/tmp/in-class-draft-ticket-polish4-clean.rl405g`: all ten claims passed; `npm test` passed 15 contracts and 58 browser tests; the nine Rust tests, format, clippy, release build, and high-severity dependency audit passed.

The live recheck used:

```sh
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
```

It passed 58/58 after deployment. The release gate also verified the SHA, PostgreSQL backend, one-replica contract, rate limit, export/delete flows, and data survival across a real revision restart.

Cold screenshots and headers are in `.factory/evidence/polish-4/`. Mobile Lighthouse scored Performance 99, Accessibility 100, Best Practices 100, and SEO 100.

## Deployment

Authorized factory workers can deploy a clean, pushed `main` revision with:

```sh
npm run deploy:release
```

This changes production and is not a claim test.

## Known gaps and next steps

None. No finding of any severity remains open.
