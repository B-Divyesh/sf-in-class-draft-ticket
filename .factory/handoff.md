# Handoff — In-Class Draft Ticket polish round 5

## Status

**PASS.** Every finding from adversarial reviews 1–5 is resolved. The repaired product is deployed at <https://in-class-draft-ticket.sociobot.in>.

## What changed

- `/demo` is the only promoted and canonical demo address.
- The landing action, shared header, 404 header, README, demo guide, claim sandbox, and sitemap now use `/demo`.
- `/?demo=1` remains a working compatibility entry and declares `https://in-class-draft-ticket.sociobot.in/demo` canonical.
- Browser and contract regressions now enforce the canonical relationship and sitemap inventory.
- `.factory/catalog-description.txt` is a 64-character verb-first sentence.
- The existing working-constellations design, isolated demo storage, backend workflow, and all earlier fixes were preserved.
- No AI or paid feature was added. Automated writing judgment conflicts with the brief, and the complete core workflow remains free.

## Verification

- Repair commit: `7e3360b7cdab03c9f25209fe8bb85c3fdc114542`.
- Clean clone: all 13 claim commands passed exactly as registered after `npm ci`.
- Local: `npm test` passed 16 contract and 60 browser tests; Rust format, clippy, 11 tests, release build, TypeScript, Vite build, and dependency audit passed.
- Accessibility/privacy/offline: live axe route scans, keyboard/focus checks, 200% reflow, touch targets, reduced motion, same-origin privacy, and service-worker offline reload passed.
- Factory URL verifier: `/`, `/demo`, `/?demo=1`, `/privacy`, and `/start` passed with no console errors.
- Live suite: 56 passed and four local-only rate cases skipped. The separate HTTP/2 check confirmed 40 allowed responses and 10 rate-limited responses with `Retry-After: 1`.
- Live Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.65 s, TBT 4 ms, CLS 0.
- Canonical cold check: `/demo` and `/?demo=1` both returned 200 and declared `/demo` canonical. `/sitemap.xml` lists `/demo` and omits the query alternate.
- Unknown route: `/not-a-route` returned 404 with the complete shared shell.

Detailed finding-by-finding evidence is in `.factory/polish-5.md`. Screenshots and Lighthouse reports are under `.factory/evidence/polish-5/`.

## Deployment

- ACR run: `ch1qk`.
- Image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:7e3360b7cdab`.
- Digest: `sha256:1b02d234e405a79da03058d97644781231bfc4027800047c18eef34e4284cc6a`.
- Live health reports build SHA `7e3360b7cdab03c9f25209fe8bb85c3fdc114542` and `storage_backend: sqlite`.
- The release gate confirmed one ready replica, mounted `/data`, no runtime secrets, and SQLite persistence across a real revision restart.

## Run and verify

```sh
npm ci
npm test
cargo test --all-targets --all-features
cargo clippy --all-targets --all-features -- -D warnings
npm run build
```

## Known gaps and next steps

None within the product scope. The five-class success measure in the research brief requires a real classroom pilot and is not presented as a shipped-product claim.
