# Polish round 1 — zero-finding repair

- Reviewed source: `.factory/review-1.md` at `7a1dea399e69432a697313e834a7d704e25b76df`
- Repaired candidate: `2f73b680e973d1d13f2aef112b6cbae2fc5ea4d4`
- Runtime repair: `9910a3ea820fd6bd60bb3f05dfeebd8aeeff78f7`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Result: all four findings resolved; no severity remains open.

## Finding reconciliation

| Finding | Change made | Automated evidence | Screenshot evidence | Cold live check |
| --- | --- | --- | --- | --- |
| F-1-1 | Registered `no-ai-detection-or-authorship-verdict` and `free-no-account-core-flow`. Each has one tagged browser test. The tests reject detection endpoints, inspect the demo request set, and finish the real teacher/student flow without sign-in or payment. | `@claim:no-ai-detection-or-authorship-verdict`; `@claim:free-no-account-core-flow`; exact claim-count contract; all passed locally, from a clean clone, and live. | [`live-root/screenshot-mobile.png`](evidence/polish-1/live-root/screenshot-mobile.png) shows the boundary copy. [`live-demo/screenshot-mobile.png`](evidence/polish-1/live-demo/screenshot-mobile.png) shows the isolated sample. | `/` and `/?demo=1` loaded cold with the correct titles, one h1, no console errors, same-origin requests, and PostgreSQL-backed sample data. |
| F-1-2 | Rebuilt the static 404 with the skip link, shared header and footer, Privacy and Terms links, icons, description, canonical, Open Graph, Twitter metadata, theme color, and the disconnected-point treatment. The server still returns HTTP 404. | `direct 404 keeps the shared navigation, legal links, and complete metadata` passes in desktop and mobile projects, including axe serious/critical checks and 200 responses for both legal routes. | [`live-404/screenshot-mobile.png`](evidence/polish-1/live-404/screenshot-mobile.png) and [`live-404/screenshot-desktop.png`](evidence/polish-1/live-404/screenshot-desktop.png). | `/not-a-route` returned 404; the saved response contains the shared shell, canonical, description, and legal links. |
| F-1-3 | Superseded the legacy rules that hid Demo and Privacy. At 560 px and below, the four links use a full-width four-column header with 44 px targets and wrapping safeguards. The same layout is present on the 404 page. | `mobile wordmark, navigation, and footer links meet the 44px target`; 390 px at 200% reflow; route axe scans; all passed locally, from a clean clone, and live. | [`live-root/screenshot-mobile.png`](evidence/polish-1/live-root/screenshot-mobile.png), [`live-demo/screenshot-mobile.png`](evidence/polish-1/live-demo/screenshot-mobile.png), and [`live-404/screenshot-mobile.png`](evidence/polish-1/live-404/screenshot-mobile.png). | Cold 390 px loads showed Demo, Join, Start a class, and Privacy with no horizontal overflow. |
| F-1-4 | Replaced the 28-word deploy sentence with two short sentences. Replaced the 26-word payment sentence with two plain sentences, backed by the new free/no-account claim. Updated the copy audit. | `@claim:free-no-account-core-flow`; `.factory/copy-audit.md` records word counts of 7, 9, 6, and 13 for the changed sentences. | [`live-root/screenshot-mobile.png`](evidence/polish-1/live-root/screenshot-mobile.png) shows the revised first-screen wording that accompanies the documentation. | `/` loaded cold with “Classroom drafting record”, “Four drafting prompts”, and “How it works in three steps”; no unsupported time phrase remains. |

## Additional required acceptance work

- The first landing action now opens `/?demo=1` in one click.
- The query route has the title `Demo — In-Class Draft Ticket`, its own canonical URL, a persistent demo banner, Reset demo, and Start for real.
- Reset provisions a different ephemeral demo while retaining three fictional tickets. Start for real deletes `demo:workspace` before opening `/start`.
- `.factory/claims.json` contains ten claims and the release contract proves exactly one tagged test per claim.
- `.factory/catalog-description.txt` is verb-first and 64 characters.
- The clearer review suggestions are applied: “Classroom drafting record”, “Four drafting prompts”, and “How it works in three steps”.
- No AI feature was added. The researched job calls for a short process record, and model inference would conflict with its stated boundary.

## Verification evidence

The clean clone at `9910a3ea820fd6bd60bb3f05dfeebd8aeeff78f7` passed `npm ci`, every command in `.factory/claims.json` separately, `npm test` (12/12 release contracts and 52/52 browser tests), TypeScript, Rust format, clippy with warnings denied, 8/8 Rust tests, the optimized Rust build, Vite build, and the high-severity dependency audit.

The live suite passed 52/52 after deployment. The repository verifier passed cold on `/` and `/?demo=1`. Live Lighthouse scored Performance 99, Accessibility 100, Best Practices 100, and SEO 100; FCP was 1.2 s, LCP 1.5 s, TBT 40 ms, and CLS 0.059. The initial JavaScript is 61.90 kB raw / 22.51 kB gzip, and CSS is 15.06 kB raw / 4.09 kB gzip.

Deployment used ACR run `ch131`, image `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:9910a3ea820f`, and digest `sha256:e4ae4fbdd92b1dc211f499efcdba7082ade9a24f121e02f83e8c8d3e455a6f88`. `/health` returned the full repair SHA and `storage_backend: "postgres"`. The deploy gate passed fresh-browser demo and real flows, the shared rate limit, and persistence across a revision restart.
