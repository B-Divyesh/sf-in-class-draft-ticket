# Handoff — adversarial first-read review 2

## Status

**FAIL.** The independent review is recorded in `.factory/review-2.md` with 2 blocking, 7 major, and 4 minor findings. No product code was changed.

The two blockers are:

1. `/privacy` inaccurately says the service stores only teacher/student-entered data, while source and migrations also store generated credentials/IDs/timestamps and short-lived raw request IPs.
2. The one-click demo loads realistic data, but no completed ticket is visible in the first 390 × 844 or 1440 × 900 viewport.

## Verification performed

- Opened the live root cold in fresh 390 × 844 and 1440 × 900 Chromium contexts.
- Entered the demo from the landing action, verified three fictional tickets, reset to a new code, left with **Start for real**, and confirmed a seeded real `teacher:` key was untouched.
- Recorded landing/demo request traffic; all requests were same-origin and no media, analytics, model, or third-party request appeared.
- Crawled all discovered links and inspected titles, h1 counts, metadata, canonicals, shared shell, and the direct 404.
- Read `.factory/review-1.md`, `.factory/polish-1.md`, and the previous handoff; all four F-1 findings are independently fixed.
- Created a separate clean clone, ran `npm ci`, and ran all ten commands in `.factory/claims.json` exactly as declared. All passed.
- Ran full `npm test` in that clone: 12/12 contract tests and 52/52 Playwright tests passed; `dist/` was produced.
- Ran `/opt/fleet/lib/verify-url.sh` against the live root; it passed with no console errors.
- Ran axe CLI 4.10.3 against the live root; it reported 0 violations.

## Known gaps and next steps

Resolve every finding in `.factory/review-2.md`, starting with F-2-1 and F-2-2. The current implementation passes its registered automated suite, but the report identifies inaccurate/unlisted copy, two claim-test coverage gaps, mobile first-screen layout failures, and plain-language issues that prevent acceptance.
