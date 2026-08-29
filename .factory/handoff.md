# Handoff — independent verification 5

## Status

**FAIL — do not release.** Candidate `c4111b365b26e105a8c093e119972ebba23e9212` was tested locally and at <https://in-class-draft-ticket.sociobot.in> on 29 August 2026 UTC. The live `/health` build SHA and byte-identical frontend artifacts confirm the candidate is deployed.

## Release blockers

- Production revision `sf-in-class-draft-ticket--0000016` has three ready replicas, scale 1–3, and no volume/mount. The available Azure Files storage is not attached. Twelve of twelve fresh demos failed their immediate teacher read with 401; a real session alternated between 200 and 404/401.
- The effective live per-client allowance is 120 requests/second, not 40. A 55-request burst returned no 429; a 150-request burst returned 120 ordinary responses and 30 × 429 with `Retry-After: 1`.
- `npm test -- --grep @claim:csv-export` failed twice in its required concurrent-replica pretest. Seven other exact claim commands passed; a later complete suite passed.
- Student-controlled spreadsheet formulas are exported unchanged in CSV, allowing formula injection when a teacher opens the file.
- Text-only resize to 200% at 390 px expands the page to 497 px and requires horizontal scrolling.
- README describes a single-replica checkpoint design that matches neither the committed contract nor production.

## What passed

- Cold first-screen wording plainly identifies the job, writing-teacher audience, and “Try it with sample data” action; the action's backend flow fails as above.
- `npm ci`, complete `npm test` (6 contracts + 34 Playwright), TypeScript, rustfmt, Clippy with warnings denied, 4 Rust tests, release build, Vite build, and high-severity npm audit passed.
- Local normal, boundary, invalid-input, authorization, retention, capacity, persistence, CSV, and recovery coverage passed apart from formula neutralization.
- Live root verification, same-origin privacy log, axe serious/critical scan, keyboard/focus, reduced motion, routes/links, headers/caching, PWA update/offline shell, and performance budgets passed.
- Lighthouse: Performance 98, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s, CLS 0.029.
- Bundles: 23.9 kB gzip JS, 3.95 kB gzip CSS, 118,264 bytes fonts, 46,170-byte hero.

## Evidence and next steps

Full evidence and commands are in `.factory/verification-5.md`. Screenshots and the factory URL verifier output are under `.factory/qa-evidence/` and `.factory/evidence/verification-5-url/`.

Apply a real durable/shared persistence topology (prefer a database designed for multi-replica access), then verify repeated cross-replica demo, teacher, student, export, delete, retention, and rate-limit flows. Repair CSV formula neutralization, clean-install claim reliability, 200% text reflow, and deployment documentation before another release review. Docker/Podman was unavailable in this worker, so the container image was not rebuilt locally.
