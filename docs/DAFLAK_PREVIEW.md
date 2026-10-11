# Daflak local preview

The selected city image is now loaded after any successful login or Guest entry.

- Terrain layout: 40 × 40 blocks across 5120 × 4480 world bounds. Each block is subdivided into 2 × 2 movement cells: 80 × 80 cells at 64 × 56 world pixels each. The collision footprint is preserved.
- The canvas fills the browser viewport using Phaser RESIZE. Camera zoom 0.5 displays each movement/hover cell at 32×28 CSS pixels; resizing reveals more/less world without stretching cells. The preview backdrop is compressed vertically to 87.5% of its previous height to retain the 80 × 80 movement grid and collision alignment. Character scale is unchanged; the original image file is untouched. Header/footer are overlays.
- Source artwork actually measures 1254 × 1254, not 2048 or 5120. It is scaled at runtime; no extra image detail is invented by that scale.
- The backdrop is a single painted concept image, NOT a seamless reusable tileset. Painted walls, props and gates cannot yet occlude the player independently.
- Hover uses the camera's world coordinates and snaps to cell corners; green means walkable and red blocked. Click targets cell centers. WASD/arrow movement finishes each cell edge, so it cannot cut blocked corners.
- BFS routes along the main cardinal avenues and central plaza. The mask in src/world/daflak-grid.ts is deliberately conservative: gardens and side districts remain blocked pending manual object/collision authoring. Gates reach the map boundary; travel to another map is not implemented.
- Camera follows the placeholder Novice. Its art remains a procedural test character.
- Top-right minimap shows the entire existing backdrop, player dot and clipped camera worldView rectangle, synchronized after rendering. Width/height percentages describe how much of the whole city is visible; resize updates the footprint. It is a read-only HUD and does not trigger movement underneath.
- Source, reference, original generation prompt and actual dimensions are in art/source/maps/daflak-city/v001.

## Favicon

index.html links public/favicon.ico (a real ICO container with 16/32/48 PNG entries), PNG icons, Apple touch icon, and public/manifest.webmanifest. Manifest icons use purpose any, not maskable: this artwork was not designed for maskable safe areas. No service worker/offline support is implied.

Export again with node scripts/export-city-and-favicon.mjs (no input argument after initial import).
