# Idle identity match v005

Runtime walk appearance correction requested by owner. Eight original W poses, E mirrored by code, 10fps; body scale and feet anchor unchanged. Appearance review pending.

The head is copied pixel-for-pixel from the shipped W idle through y110, without scaling. Width38px versus old41-42px. All eight heads are identical. Below the head, original alpha and limb silhouettes are unchanged. Shared per-material RGB adjustments normalize tunic, trousers, leather, cuffs, ivory, steel and gold against the shipped W idle. This is palette matching, not a claim of identical shading at every differently posed body pixel. Mirrored W head on E walk matches size/palette but is not pixel-identical to the independently authored E idle.

Final sources: walk-before.png (accepted v004 poses), idle-w.png (actual shipped head/palette), idle-e.png (comparison). Run export.mjs then scripts/export-novice-walk.mjs. Runtime: public/assets/characters/novice-male-walk-w.png. preview.html compares actual W/E idle, old walk and corrected walk. comparison.png is idle / before / after. Frame exports and GIF are in this folder.

Built-in imagegen whole-sheet edit was evaluated but not selected because it still changed head details. Exact prompt and actual references are recorded in prompt.json; the rejected bitmap was removed. Final composition uses the already generated accepted pose art plus the shipped idle. v004 generation provenance is retained under provenance; referenced former paths there are historical, not live dependencies.

QA: head pixels exact to W idle in every frame, no body alpha changes; shipped atlas exact to export. Real keyboard W/E movement, all8 frames, mirror, stop-to-idle, remote clients and idle regressions passed. Screenshots reviewed. See qa.json, browser-qa.json and docs/art/cleanup-identity-v005.json.
