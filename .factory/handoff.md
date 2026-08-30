# Polish 4 handoff

## Status

**PASS — released repair.** The fourth drafting checkpoint is named **exit reflection** everywhere. The free limit now says **40 draft tickets per session** everywhere it appears. The product keeps its paper-ticket/constellation identity and all earlier repairs remain live.

Wording repair source: `beffeac4bdc7178165888184c318b844addc5295`.

Final repair source: `7864b293028bf0ed1bc99911a766418437933494`.

Live deployment: <https://in-class-draft-ticket.sociobot.in>.

Image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:7864b293028b` (`sha256:3d92ede427dbe5fec1305b086479cf1f76063940be4d168fdbc262a3f67100e0`). ACR run: `ch1bh`.

## What changed

- Landing field lists now end with “exit reflection,” matching the student form, teacher sheet, and README.
- The reflection helper asks what the student will revisit after class.
- The landing fact, terms, README, claim registry, audit, and catalog description now say “Free sessions accept up to 40 draft tickets.”
- Added a browser regression that compares those words across landing, student form, and terms.
- The direct 404 wordmark now uses the same ink color as the rest of the shared product shell. Its regression asserts the computed color.

## How to run and verify

```sh
npm ci
npm test
cargo test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo build --release
```

Every declared claim is in `.factory/claims.json`. Run each listed command from a fresh clone. The final source was verified from `/tmp/in-class-draft-ticket-polish4-final-clean.OWbWhb`: all ten claims passed. The final local `npm test` passed 15 contracts and 58 browser tests; the clean-repair gate also passed nine Rust tests, format, clippy, release build, and the high-severity dependency audit.

The live recheck used:

```sh
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
```

It passed 58/58 after deployment. The release gate also verified the SHA, PostgreSQL backend, one-replica contract, rate limit, export/delete flows, and data survival across a real revision restart.

Cold screenshots and headers are in `.factory/evidence/polish-4/`. The final 404 visual evidence is `live-404-final-mobile.png`. Final mobile Lighthouse scored Performance 99, Accessibility 100, Best Practices 100, and SEO 100.

## Deployment

Authorized factory workers can deploy a clean, pushed `main` revision with:

```sh
npm run deploy:release
```

This changes production and is not a claim test.

## Known gaps and next steps

None. No finding of any severity remains open.
