# Idle breathing preview audit — 2026-10-15
- Generated eight complete four-frame strips with image_gen.imagegen using attached high-resolution direction seeds. Exact prompts/references in prompts.json. Actual model not exposed.
- Inspected all eight source strips: same facing, planted standing legs, chest/shoulder lift. NW generated with unwanted background; removed via image tool and deterministic chroma export. Repair prompt recorded.
- Exported 32 distinct RGBA PNGs at 240x240 with common baseline and one scale per direction. AI painted details retain small frame-to-frame differences; this is a candidate awaiting owner visual approval, not production certification.
- Playwright Edge: all eight images load; four real image sources cycle; transforms remain constant; pause freezes; step cycles; narrow screen no overflow; no JavaScript errors. Screenshots reviewed on green and light backgrounds.
- Removed obsolete CSS breathing check and prior preview check, plus their replaced idle screenshots: check-breathing.mjs, check-preview.mjs, idle-breathing-preview.png, idle-preview.png. Old static direction images remain intentional identity references for generated source lineage. Walk source candidates remain deferred diagnostic work, not part of current preview.
- Runtime game and public/assets untouched. Idle-only preview replaces the prior combined walk/CSS-idle preview.
