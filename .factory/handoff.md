# Review 5 handoff — In-Class Draft Ticket

## Status: FAIL

First-read product QA completed against repository base `e7a2eae6f8431227bd041765e73f04f01de6b765` and live build `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf` on 1 September 2026 UTC.

No product code, deployment, or cloud configuration was changed. Temporary QA sessions were deleted or remain subject to the documented demo expiry. The repository changes are limited to the report, screenshots, and this handoff.

## Remaining finding

- `F-5-1` (minor): `/demo` is linked publicly, returns 200, and declares itself canonical, but `sitemap.xml` lists only `/?demo=1`. Use `/demo` as the single canonical demo address, list it in the sitemap, and keep the query address as an alternate that declares `/demo` canonical.

PASS requires this finding to be fixed and the full checklist to return zero findings.

## Confirmed checks

- Fresh 390 × 844 and 1440 × 900 first screens clearly state the job, audience, first action, and three product facts.
- The one-click demo immediately shows a realistic completed ticket. Its banner, reset, exit, separate browser key, unchanged real key, and same-origin request behavior pass.
- All 13 claim commands pass from a separate clean clone.
- The full live Playwright suite passes 56 checks with four intentional local-only skips.
- The separate live HTTP/2 rate check confirms the exact 40-request boundary and `Retry-After: 1`.
- Public-route axe, console, keyboard, focus, Back, reflow, touch-target, offline, metadata, 404, and link checks pass.
- Every finding from reviews 1–4 remains fixed in live behavior and current source.
- Landing and README copy contain no overlong sentence, banned marketing word, unclear result action, unlisted end-user claim, or terminology drift.
- No additional AI, import, export, or sync feature is clearly required by the brief.

## Evidence and commands

Detailed results are in `.factory/review-5.md`. Fresh screenshots are under `.factory/review-5-evidence/`.

```sh
npm ci
# Run each command in .factory/claims.json from a clean clone.
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
npm run verify:rate-http2
```

The exact claim commands and results are listed in the review report.
