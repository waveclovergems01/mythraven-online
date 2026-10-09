# Login artwork — MR-ART-v1

Generated with the built-in image_gen tool in the preceding chat turn; selected by the user for integration. No image references were attached to those generation calls. The prompts used the documented palette and art direction. The original PNGs are preserved here; browser exports live in public/assets/ui. No new artwork was generated during integration.

## Logo (transparent_background=true)
Use case: logo-brand
Asset type: game title logo / wordmark for a fantasy MMORPG login screen
Primary request: create an original logo reading exactly “MYTHRAVEN” with “ONLINE” centered beneath it, spelled correctly.
Style/medium: hand-painted 2D fantasy RPG logo, elegant engraved gold lettering, weathered antique-gold metal, subtle deep forest-green shadow, a small faceted arcane-blue crystal above the title, restrained symmetrical raven-wing flourishes. Cohesive with MR-ART-v1: muted moss greens, earthy browns, warm ivory, aged gold, subdued steel, controlled arcane-blue accent.
Composition/framing: centered horizontal wordmark, transparent background, generous padding, readable at 320px wide, no surrounding scene.
Lighting/mood: soft upper-left highlight, dignified mysterious adventure.
Constraints: actual transparent alpha; exact text only “MYTHRAVEN” and “ONLINE”; no other words, no mockup, no rectangle, no login UI, no watermark.

## Background (transparent_background=false)
Use case: stylized-concept
Asset type: login screen background for a browser MMORPG
Primary request: a low-detail atmospheric fantasy background for Mythraven Online, designed to sit behind a centered login card and logo.
Style/medium: cohesive hand-painted 2D fantasy RPG environment art, soft painterly shapes, crisp but quiet silhouettes, matching MR-ART-v1.
Composition/framing: 16:9 wide landscape; deep forest-and-stone ruin at dusk; a dark open central area with subtle mist and very low visual detail so white and gold login text remains readable; visual interest pushed to the left and right edges; no characters in the center.
Scene/backdrop: mossy ancient stone arches, distant crooked trees, small blue arcane lanterns, faint mountain silhouettes, shallow fog.
Lighting/mood: soft screen-upper-left moonlight, muted mysterious adventure, dark teal and forest green with restrained aged-gold and arcane-blue accents.
Color palette: #0c141a, #1d3434, #385342, #68794d, #80634b, small #74b4c2 accents.
Constraints: no logo, no words, no letters, no UI, no panels, no buttons, no watermark, no readable text, no high-frequency detail in the center, no photorealism, no glossy 3D render, no strict pixel art. This is a background plate, not a playable map.

## Frame (transparent_background=true)
Use case: ui-mockup
Asset type: fantasy MMORPG login panel frame / UI nine-slice source
Primary request: an original ornate rectangular login panel frame for Mythraven Online.
Style/medium: hand-painted 2D fantasy RPG UI, antique dark teal wood and aged gold metal trim, subtle moss and raven-feather motifs, restrained arcane-blue crystal accents, cohesive with MR-ART-v1.
Composition/framing: tall portrait rectangle, front-facing flat UI surface, transparent center and transparent outside the border; designed as a border source that can be stretched or nine-sliced without distorting the corners. Keep the border thickness even, corners distinct and richly detailed, center completely empty.
Lighting/mood: soft upper-left highlight, dignified mysterious adventure.
Color palette: dark forest teal, deep brown, aged gold, muted ivory, tiny arcane-blue accents.
Constraints: actual transparent alpha; no words, no letters, no logo, no buttons, no input fields, no symbols in the empty center, no background scene, no watermark, no photorealism, no glossy 3D render, no strict pixel art.

## Browser export
Run `node scripts/export-login-art.mjs` from the repository root to export again from the preserved originals.
Logo: 640×320 lossless WebP. Background: 1280×720 WebP quality 78 (opaque decorative background). Frame: 512×768 lossless WebP with alpha. CSS slices: top/right/bottom/left = 100/64/100/64, no center fill; an HTML background maintains form readability. All controls and translations remain real HTML.
