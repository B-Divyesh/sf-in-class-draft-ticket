# Visual thesis: working constellations

## Direction and purpose

The interface uses generative geometry to show writing as a series of connected choices. Small plotted points, ruled paths, and ticket-shaped planes form an evolving constellation. This avoids surveillance imagery and makes the process record feel constructive, human, and provisional.

The page is light-led and explicitly single-mode. A cream paper field supports long classroom use, while deep ink supplies reliable contrast. The dark teacher workspace is a separate functional surface, not a theme toggle.

## Tokens

- Paper background: `#F5F1E8`
- Raised paper: `#FFFDF8`
- Ink: `#17221E`
- Muted ink: `#55615B`
- Moss: `#315B49`
- Moss hover: `#244737`
- Citrus marker: `#D8F15A`
- Clay accent: `#C65D3A`
- Cobalt geometry: `#315EA8`
- Success: `#236A49`
- Warning: `#8A5417`
- Danger: `#A23B32`
- Rule: `#CBD1C8`

Contrast pairs use ink on paper, white on moss, and ink on citrus. Body text never uses clay or cobalt.

## Typography

The display face is Fraunces, self-hosted as a variable WOFF2 subset, for editorial warmth and the uneven rhythm of drafted prose. The body face is Atkinson Hyperlegible Next, self-hosted as a WOFF2 subset, for quick scanning in a busy classroom. If font files cannot ship, the fallbacks are Georgia and system sans-serif. Body text starts at 17px with 1.55 leading. Ticket codes and table numbers use tabular figures.

## Spacing and shape

The spacing scale is 4, 8, 12, 16, 24, 32, 48, 64, and 96px. Content measures no more than 68 characters. Panels use clipped ticket corners and one offset shadow, never soft floating cards. Dashed perforations separate actions from records. All controls are at least 44px high.

## Interaction grammar

- Creating a session plots the first node in the teacher's line.
- Each response adds a small point to a session count.
- Success uses a short line-drawing animation from the triggering control.
- Route changes focus the page heading and announce the new page.
- Destructive actions name their target and require confirmation.

## Motion policy

One signature motion joins nearby plotted points over 240ms with transform and opacity only. Nothing loops. With `prefers-reduced-motion: reduce`, lines appear immediately and all scrolling is instant.

## Responsive intent

At 390px, decorative geometry reduces to one cropped band. Teacher tables become stacked response sheets, the session code stays large, and primary actions remain visible without horizontal scrolling. The desktop two-column workspace becomes one linear task flow.

## Art plan and provenance

The hero is an original generated editorial still life: four blank paper ticket planes connected by precise cobalt and moss lines, with a single citrus marker dot. It explains that a draft becomes a small set of connected checkpoints. It contains no people, brands, interface claims, or readable text.

Prompt sheet:

> Use case: stylized-concept. Asset type: landing-page hero and social crop. A tactile editorial still life on warm cream paper: four blank ticket-shaped paper planes at different heights, joined by fine plotted lines and small registration dots, suggesting a writing process becoming visible. Generative geometric composition, subtle paper fibers, crisp cut edges, soft directional classroom-window light, gentle shadows, limited palette of forest moss, deep ink, cobalt blue, citrus yellow, and terracotta. Wide landscape framing with calm negative space. No text, no letters, no people, no devices, no logos, no watermark, no gradients, no surveillance symbols.

Generation: Azure AI Foundry factory image deployment via `/opt/fleet/lib/gen-image.sh`, 28 August 2026. Generated assets are original for this product. Source PNG and prompt sidecar live in `assets/src/`; optimized WebP lives in `public/assets/`.

Hand-authored SVG geometry is used for the wordmark, favicon, and tiny interface marks. It follows the same plotted-line system and contains no third-party artwork.

## Page composition

The landing first screen is left-heavy: a practical statement and action sit beside the generated paper constellation. A ruled live-preview strip cuts into the next section. How-it-works follows a diagonal three-stop plotted line rather than a feature-card grid. The privacy section resembles the reverse of a paper ticket. Pricing is a single clipped placard because only one paid tier exists. The 404 page shows one disconnected plot point and a line home.
