# 圣经人物排行功能 — Design QA

## Comparison target

- Source visual truth (user reference): `C:\Users\huawei\AppData\Local\Temp\codex-clipboard-fb9c4099-466e-45d4-bdfa-16f68ab9bdfd.png`
- Same-state source capture: `C:\Users\huawei\AppData\Local\Temp\codex-theology-people-cdp-1440x1024-20260712-195554.png`
- Implementation screenshot: `C:\Users\huawei\AppData\Local\Temp\codex-people-final-1440x1024.png`
- Side-by-side comparison input: `C:\Users\huawei\AppData\Local\Temp\codex-people-comparison-1440x1024.png`
- Ranking desktop screenshot: `C:\Users\huawei\AppData\Local\Temp\codex-ranking-sidebar-removed-1440x900.png`
- Ranking mobile screenshot: `C:\Users\huawei\AppData\Local\Temp\codex-ranking-sidebar-removed-390x844.png`

## Viewport and state

- People-section comparison: 1440 × 1024 desktop, `#bible-people` scrolled into view.
- Ranking desktop: 1440 × 900, lifespan tab selected.
- Ranking mobile: 390 × 844, accession-age tab selected.

## Full-view comparison evidence

The same-state desktop comparison keeps the source section's black canvas, warm-gold type, hero hierarchy, three-column person-card grid, card borders, and button treatment. The only above-the-fold structural difference is the requested three-button action row: the original map entry remains first, with the two ranking entries beside it. The people cards shift downward by that one intentional row; their sizing, spacing, and content density remain intact.

The ranking views continue the existing dark/gold visual language while adding no substitute imagery, custom SVG artwork, or placeholder assets. The ranking routes intentionally omit the left learning-navigation sidebar; mobile keeps the existing bottom navigation and the content remains within the 375 px document width (`scrollWidth === clientWidth`).

## Focused region comparison evidence

The action row was checked in the side-by-side image at 1440 × 1024. The new links use the source button's compact pill shape, gold border, fill, text color, and spacing. Their labels are fully visible and the row sits between the introduction and the cards, rather than altering the page-level navigation.

The ranking tabs and chart rows were checked in the desktop and mobile captures. The selected tab is visually distinct; rank bars, values, Bible references, and the dispute/calculation notes remain aligned without clipping.

## Fidelity surfaces

- **Fonts and typography:** The people-section heading and card typography retain the source's serif display/body hierarchy. The ranking view uses a compatible serif display face and readable compact metadata; no truncation was observed at either verified width.
- **Spacing and layout rhythm:** Existing people cards retain their three-column desktop structure. The added action controls are grouped and do not overlap the cards. Mobile rank rows collapse into a readable two-column flow.
- **Colors and visual tokens:** The black ground, warm off-white copy, muted secondary text, and gold interactive accents are consistent with the source section.
- **Image quality and asset fidelity:** The source section contains no required imagery or custom icons for this addition. No image asset was substituted with CSS art, SVG, emoji, or placeholders.
- **Copy and content:** The requested labels are present: `圣经寿命排名` and `登基年龄排名`. Both views expose the supplied workbook-derived ranking data and their own `争议与推算` notes.

## Findings

- No actionable P0, P1, or P2 mismatches found.
- No P3 follow-up is required for the implemented scope.

## Primary interactions tested

- The three people-section links have the expected destinations: character map, lifespan ranking, and accession-age ranking.
- Direct `?view=accession` loading selects `君王登基年龄排名`.
- Switching from accession age to lifespan and back updates the visible ranking and restores `?view=accession` in the URL.
- Console errors captured on the ranking desktop and mobile routes: none.

## Comparison history

1. 2026-07-12 — Compared the 1440 × 1024 source capture and final implementation in one side-by-side image. No P0/P1/P2 issue was found, so no visual-fix iteration was required.

## Implementation checklist

- [x] Place the two ranking entries beside the existing character-map control in `圣经人物`.
- [x] Hide the left learning-navigation sidebar on both age-ranking routes only.
- [x] Render lifespan and accession-age data with separate selectable views.
- [x] Surface dispute/calculation notes below each ranking.
- [x] Verify desktop and mobile layout, tab behavior, console errors, lint, and production build.

final result: passed

# Travel map glacier theme QA

## Visual comparison

- Source: `D:\UserTemp\huawei\codex-clipboard-238423e4-a62d-4e9a-8aaa-7c6c6317537b.png`
- Desktop implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-theme-switch\desktop-glacier-final2.png`
- Mobile implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-theme-switch\mobile-glacier-final2.png`
- Side-by-side comparison: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-theme-switch\reference-vs-glacier-final2.png`
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=glacier-final2#globe/2.70/28.00/77.09`
- Reference pixels: 1448 × 1086; normalized implementation viewport: 1440 × 900.
- Responsive verification viewport: 390 × 844.
- Compared state: `3D 地球`、`冰川白`、默认亚洲相机。

The full comparison was normalized to the desktop implementation viewport before inspection. It includes the globe material, large bright labels, orange photo-count markers, short place names, and upper-right theme switch. The separate mobile capture was used to inspect the compact control placement and responsive marker labels.

## Required fidelity surfaces

- **Globe material:** The glacier theme uses a dark blue-gray ocean, ice-white land gradient, pale-cyan borders and subtle grid, a bright rim, and a real starfield background. The existing dark vector theme remains unchanged and selectable.
- **Map typography:** Major continent and country labels are approximately twice the previous size, bright white, and outlined for contrast against both themes.
- **Photo markers:** Each visible photo-count circle has a concise place name directly above it. Shanghai, Sanya, Tokyo, and Jamaica remain tied to their existing album routes and counts.
- **Theme control:** `暗夜` and `冰川白` are keyboard buttons in the upper-right, expose `aria-pressed`, and persist the selected theme through reloads.
- **Responsive layout:** The desktop and mobile captures have zero document overflow, no clipped controls, and no overlapping title or theme switch.

## Findings and comparison history

1. Initial pass: full album titles above markers created a P2 clutter issue and duplicated generic city labels.
2. Fix: replaced them with short place names and removed the duplicated generic city labels while retaining the major country and continent labels.
3. Final pass: no actionable P0, P1, or P2 issue remains.
4. P3 intentional difference: the implementation keeps the current Natural Earth vector geometry and archive panel instead of introducing a satellite texture or removing existing site navigation.
5. P3 intentional difference: the previously removed route arc remains absent, so the earlier anomalous curved line is not reintroduced.

## Primary interactions tested

- Switched `暗夜` ↔ `冰川白`; colors, markers, starfield, and button states updated.
- Reloaded after selecting `冰川白`; the theme persisted from local storage.
- Switched `平面地图` ↔ `3D 地球` and retained the existing flat parchment mode.
- Dragged, zoomed, and reset the globe without visible stutter or stale marker positions.
- Verified visible place names above Shanghai, Sanya, and Tokyo markers at the default Asia camera; Jamaica appears after rotating to its hemisphere.
- Desktop 1440 × 900 and mobile 390 × 844: zero page/console errors and zero horizontal or vertical document overflow.

final result: passed

# Travel map dark atlas reference QA

## Visual comparison

- Source: `D:\UserTemp\huawei\codex-clipboard-db9c133c-46f4-478d-9ca3-b79f3060a654.png`
- Desktop capture: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-dark-reference\desktop-1440x900-v1.png`
- Mobile capture: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-dark-reference\mobile-390x844-v1.png`
- Same-viewport comparison: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-dark-reference\reference-vs-implementation-1440x900.png`
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/`

The 3D view now follows the reference's black canvas, near-black navy ocean, dark moss land, thin desaturated borders, muted place labels, oversized Asia-centered globe, and blue-violet circular statistics. Decorative stars, graticules, glowing route arcs, land sparkles, and the crystal highlight shell were removed. The existing four real albums, counts, cover hover cards, routes, archive list, and flat-map mode were preserved.

## Findings

- P0: none. Album destinations, counts, map data, and route structure are unchanged.
- P1: none. Globe drag, reset, mode switching, and marker projection work without console or page errors.
- P2: intentional difference from the reference: marker density reflects the four published personal albums instead of copying unrelated library data; the website's left archive panel remains present.
- No document-level horizontal overflow, clipping, or unintended overlap was found at 1440 × 900 or 390 × 844.

## Verification

- `npm run build`: passed; 133 pages generated and the alternative-knowledge regression passed.
- `npm run lint`: the edited `travel-map.astro` has no diagnostics; the repository still reports 12 pre-existing errors in unrelated photo-album and Bible-reader files plus 6 Daily Radio hints.
- Desktop 1440 × 900: four markers rendered, flat/globe switching passed, reset after drag passed, and console/page errors were empty.
- Mobile 390 × 844: four markers rendered, controls and archive remain usable, no horizontal overflow, and console/page errors were empty.
- Same-viewport reference comparison completed; no actionable P0, P1, or P2 fidelity mismatch remains.

final result: passed

# Travel map green globe performance QA

## Scope

- Source color swatch: `D:\UserTemp\huawei\codex-clipboard-26d8f61b-6700-4d68-a1b1-b5f9f250d704.png` (`#8eab72` sampled average).
- Desktop capture: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-green-performance\desktop-1440x900.png`.
- Mobile capture: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-green-performance\mobile-390x844.png`.
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=greenperf2#globe/2.70/28.00/77.09`.

## Performance diagnosis and fix

- Baseline automated 120-step drag: average frame interval 50.9 ms, p95 116.7 ms, 15 intervals above 34 ms.
- Root causes: every pointer event triggered a synchronous full render; starfield, country geometry, glow points, and grid samples were recomputed at drag frequency.
- Fix: coalesced pointer rendering with `requestAnimationFrame`, cached the starfield, removed duplicate country-path tracing, precomputed glow samples, and temporarily reduced globe-only detail while dragging. Full detail returns immediately on pointer release.
- Final automated 120-step drag: average 17.0 ms, p95 16.8 ms, only 1 interval above 34 ms (the pointer-release full-detail frame).

## Visual and interaction verification

- Continents use the requested pale green palette centered on `#8eab72`; country borders use deep green `#173f2b`.
- 1440 × 900 and 390 × 844: no horizontal or vertical document overflow, clipping, or control overlap.
- Globe drag, reset, markers, labels, and mode state remained functional.
- Browser console and page errors: none at both viewports.
- `npm run build`: passed, 133 pages generated and the existing alternative-knowledge regression passed.
- `npm run lint`: the modified travel map has no diagnostics; the repository-wide command remains blocked by 12 pre-existing errors in unrelated album and Bible-reader files plus 6 Daily Radio hints.

final result: passed

# Travel map indigo ocean and shell-arc correction QA

- Reported arc reference: `D:\UserTemp\huawei\codex-clipboard-eefd5e87-ee91-4d3b-8f63-2998409ca347.png`.
- Requested color reference: `D:\UserTemp\huawei\codex-clipboard-e15989e2-5830-4c02-93fa-d1957275b14a.png` (`#2300a5`).
- Root cause: the visible gray curve was a manually drawn partial crystal-shell reflection at 86% of the globe radius, not geography or a projection defect.
- Fix: removed only that decorative reflection path and retained the globe rim, country boundaries, grid, labels, and marker interaction.
- Ocean base is now `#2300a5`, with lighter `#4b32d2` illumination and darker `#0d0048` edge shading for spherical depth.
- Desktop capture: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-indigo\fixed-indigo-1440x900.png`.
- Mobile capture: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-indigo\fixed-indigo-390x844.png`.
- 1440 × 900 and 390 × 844: no document overflow, browser console errors, page errors, or control overlap.
- Globe drag and reset were exercised at both viewports.
- `npm run build`: passed, 133 pages generated and the existing alternative-knowledge regression passed.

final result: passed

# Travel map parchment flat-mode QA

## Visual comparison

- Source visual truth: `D:\UserTemp\huawei\codex-clipboard-6bd33456-0edf-4b37-b6e4-f82aa853b181.png`
- Generated parchment texture: `C:\tmp\codex-stock-tracking-release-20260812-014333\public\images\travel\travel-map-parchment.webp`
- Desktop implementation: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-parchment-qa\desktop-v2.png`
- Mobile implementation: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-parchment-qa\mobile-v2.png`
- Hover-state implementation: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-parchment-qa\desktop-hover-v2.png`
- Side-by-side comparison: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-parchment-qa\comparison-v2.png`
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=parchment2#flat/1.05/0.00/0.00`
- Source pixels: 768 × 1280 portrait reference.
- Desktop implementation/CSS viewport: 1440 × 900 at device scale factor 1.
- Mobile implementation/CSS viewport: 390 × 844 at device scale factor 1.
- Comparison normalization: the portrait reference was proportionally normalized to 900 px height beside the uncropped 1440 × 900 desktop implementation; the differing aspect ratio is intentional and documented rather than stretched.
- State: flat map, default center and zoom, all four published album markers visible.

## Full-view comparison evidence

The implementation reproduces the reference's warm ivory parchment, irregular sepia fiber grain, brown land masses, fine dark country outlines, subdued map grid, restrained engraved-label palette, and archival atlas atmosphere. The actual Natural Earth geometry remains interactive and replaces the reference's decorative fantasy geography. The page chrome changes to walnut, vellum, and oxblood only while flat mode is active; globe mode retains the existing black-and-gold crystal styling.

## Focused comparison evidence

The map/label region and marker hover state were checked separately. Country boundaries remain crisp at 1440 × 900, the generated texture has no text or embedded map artifacts, the oxblood album markers remain distinct from the land layer, and the parchment hover card stays within the viewport. A separate mobile capture confirms the world map, archive list, four markers, statistics, and mode switch fit within 390 × 844.

## Required fidelity surfaces

- **Fonts and typography:** Existing Chinese serif hierarchy is preserved and recolored to dark walnut. Map labels use restrained sepia fills with a pale parchment keyline for legibility.
- **Spacing and layout rhythm:** Existing controls, heading, country archive, markers, and statistics retain their positions. The desktop flat-mode title is reduced only enough to prevent the Jamaica marker from covering the title.
- **Colors and visual tokens:** Warm ivory, sand, taupe, walnut, and oxblood match the reference's antique cartographic palette; no cool black/teal globe tokens leak into flat mode.
- **Image quality and asset fidelity:** A dedicated 1920 × 1080 WebP parchment texture was generated from the reference's paper material only. It contains no map, text, compass, ship, creature, watermark, or repeated seam, and is cover-cropped without stretching.
- **Copy and content:** Existing title, archive totals, country names, photo counts, navigation copy, and album routes are unchanged.

## Findings and comparison history

- P0: none.
- P1: none.
- P2 initial pass: the larger desktop title touched the Jamaica marker. Fixed by narrowing the flat-mode heading and reducing only its desktop display size; the final screenshot shows a clear gap while preserving the hierarchy.
- P3 intentional difference: decorative compass, ship, anchor, and sea-creature illustrations from the reference are omitted so they do not obstruct real labels, markers, or pan/zoom interaction. The parchment texture and cartographic treatment carry the requested style without turning the functional map into a static poster.

## Primary interactions tested

- Dragging the flat map updates latitude and longitude in the URL hash.
- Mouse-wheel zoom updates the flat-map zoom state.
- Switching between flat map and 3D globe preserves each mode's camera state and visual theme.
- The Jamaica hover card opens inside the desktop viewport.
- Clicking the Sanya marker opens the existing Sanya album route.
- Desktop and mobile browser console/page errors: none.

## Flat interaction correction

- Reported artifact references: `D:\UserTemp\huawei\codex-clipboard-069f7d52-f0a0-435c-8872-dd115a4810cb.png` and `D:\UserTemp\huawei\codex-clipboard-bba05383-b1fb-4fa4-9b2b-7eda7cf38076.png`.
- Reproduction: the fixed 1440 × 900 drag path produced a large brown triangle from a date-line polygon; baseline capture is `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-flat-fix\baseline-after-drag.png`.
- Root cause: wrapped flat projection split a ring at ±180° and the canvas fill closed the separated pieces across the viewport.
- Fix: flat geometry is unwrapped into continuous longitudes and only adjacent visible world copies are drawn; flat longitude is normalized after each drag.
- Desktop result: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-flat-fix\fixed-after-drag-1440x900.png`.
- Mobile result: `C:\Users\huawei\.codex\visualizations\2026\08\08\019fe034-762a-77e0-ba58-7b5af304c309\travel-map-flat-fix\fixed-after-drag-390x844.png`.
- The flat markers now use pale green `rgba(174, 202, 149, 0.96)` with dark-green text and borders.
- The title/archive panel uses a 74% white frosted layer, 22 px backdrop blur, and z-index 12. Its bounding position changed by exactly 0 px during desktop and mobile drag checks.
- Six consecutive full-width drag passes kept longitude normalized between -180° and 180° and produced no console or page errors.
- Desktop 1440 × 900 and mobile 390 × 844 remained free of document overflow.

final result: passed

# Travel map gold crystal globe QA

## Visual comparison

- Source: `D:\UserTemp\huawei\codex-clipboard-62f416be-5a35-4dec-a992-500770de60a8.png`
- Desktop implementation: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-crystal-qa\desktop-v4.png`
- Mobile implementation: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-crystal-qa\mobile-v4.png`
- Focused side-by-side: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-crystal-qa\comparison-v4.png`
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=crystal4#globe/2.70/28.00/77.09`
- Desktop viewport: 1440 × 900
- Mobile viewport: 390 × 844

The implementation keeps the existing Asia-centered Canvas 2D globe, GeoJSON projection, labels, markers, layout, and interaction model. The visual layer now uses a programmatic black star field, black-blue ocean glass, dark amber land fill, brighter gold coastlines, restrained gold country borders and spherical grid lines, land-clipped gold light points and network fragments, a thin icy-blue rim, and partial warm glass reflections. The target image is used only as visual reference and is not included as a page background or globe texture.

## Findings

- P0: none. Album data, coordinates, routes, projection, and marker meaning remain unchanged.
- P1: initial pass made the continents too uniformly bright and metallic. The final pass darkened the base land layer, reduced glow, increased fine land-clipped points and network fragments, and restored clearer separation between the glass shell and internal map.
- P2: none after the final desktop/mobile pass.
- P3 intentional difference: the target faces the Americas, while the implementation retains the required Asia/China default camera. Canvas 2D approximates physical glass refraction with layered gradients and rim highlights rather than WebGL transmission shaders, avoiding a new dependency or rendering-engine rewrite.

## Verification

- `npm run build`: passed; 133 pages generated and the existing alternative-knowledge regression passed.
- `npm run lint`: the project still reports 12 pre-existing diagnostics in unrelated pages; `travel-map.astro` has no diagnostic.
- Desktop 1440 × 900: globe, labels, archive list, controls, markers, statistics, and return link remain visible without clipping or overlap.
- Mobile 390 × 844: the full globe remains visible; title, archive list, markers, statistics, and mode switch fit without horizontal overflow.
- Drag rotation updates longitude/latitude hash state.
- Mouse-wheel zoom updates globe zoom.
- Flat/globe mode switching updates the active state and hash.
- Mobile two-pointer pinch changes globe zoom while keeping the center coordinates stable.
- Japan marker click navigates to the existing Japan Kanto album route; all four marker hrefs remain unchanged.
- Browser console and page errors: none.

final result: passed

# Travel map scale and typography refinement QA

## Visual comparison

- Source visual truth: `D:\UserTemp\huawei\codex-clipboard-4b6271a7-728e-49a9-b1b2-8da775eed849.png`
- Desktop implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-scale-typography\desktop-dark.png`
- Glacier implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-scale-typography\desktop-glacier.png`
- Mobile implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-scale-typography\mobile-dark.png`
- Full-view comparison: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-scale-typography\reference-vs-implementation.png`
- Focused globe/type comparison: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-scale-typography\focused-globe-type-comparison.png`
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=scale-type1#globe/2.70/28.00/77.09`
- Source pixels: 3403 × 1698. The source was contained on a black 1440 × 900 canvas for the full comparison.
- Implementation pixels/CSS viewport: 1440 × 900 at device scale factor 1; mobile 390 × 844 at device scale factor 1.
- State: dark theme, 3D globe, default Asia camera at `#globe/2.70/28.00/77.09`.

## Findings

- No actionable P0, P1, or P2 issue remains.
- P3 intentional difference: the reference has heavy outlined map labels, while the implementation deliberately uses smaller 400/500-weight square sans-serif labels without a stroke, following the user's requested refinement.
- P3 intentional difference: the implementation retains the theme switch and existing album archive controls.

## Required fidelity surfaces

- **Fonts and typography:** Globe country labels use a 400 weight and continent labels use 500, with Noto Sans SC / Microsoft YaHei UI fallbacks. Desktop sizes are 12px and 15px respectively; no globe-label `strokeText` or shadow is applied. Marker place names use the same square sans-serif family at 500 weight with no text shadow.
- **Spacing and layout rhythm:** At 1440 × 900 the globe radius is approximately 302px, centered at 50% of the canvas width and 53% of its height. It retains clear top, right, bottom, and left breathing room.
- **Colors and visual tokens:** The dark and glacier palettes are unchanged; only type weight, type size, and the globe's default scale/position changed.
- **Image quality and asset fidelity:** Existing vector land geometry and the real glacier starfield asset remain sharp at desktop and mobile sizes.
- **Copy and content:** All country, continent, city, archive, count, and control copy is unchanged.

## Comparison history

1. Initial implementation used a desktop radius up to 42% of viewport width / 52% of viewport height and 18–24px bold outlined map labels, producing the oversized, heavy appearance identified by the user.
2. First refinement reduced the height-based radius but still allowed 29% of viewport width, which remained too large relative to the wide source composition.
3. Final refinement limits the desktop radius to 21% of viewport width / 40% of viewport height, preserves four-sided space, and replaces the outlined labels with smaller 400/500-weight square sans-serif text. The post-fix full and focused comparisons show no remaining P0/P1/P2 mismatch.

## Primary interactions and responsive checks

- Dark and glacier themes render at the new default globe size.
- Theme switch state remains functional in all captured views.
- Visible marker names remain 上海、三亚、东京 at the default Asia camera.
- Desktop 1440 × 900 and mobile 390 × 844 have zero horizontal and vertical document overflow.
- Browser page errors: none in all three captured states.
- Production build and alternative-knowledge regression test passed; 133 pages generated.

final result: passed

# Travel map flat overlay and marker refinement QA

## Visual comparison

- Source visual truth: `D:\UserTemp\huawei\codex-clipboard-4e06ea6c-1115-4448-910e-e95c41d8ea6e.png`
- Reference-state implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-flat-overlay\reference-state-final.png`
- Desktop implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-flat-overlay\desktop.png`
- Mobile implementation: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-flat-overlay\mobile.png`
- Full-view comparison: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-flat-overlay\reference-vs-flat-overlay.png`
- Focused panel/marker comparison: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-flat-overlay\focused-panel-marker-comparison.png`
- Local preview: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=flat-overlay-final#flat/1.05/0.00/0.00`
- Source pixels: 2084 × 1057. Implementation comparison pixels: 2084 × 1058.
- Reference-state CSS viewport: 1042 × 529 at device scale factor 2. Standard desktop: 1440 × 900 at scale factor 1. Mobile: 390 × 844 at scale factor 1.
- State: flat parchment map, default camera, Shanghai marker hover for the reference-state comparison.

## Findings

- No actionable P0, P1, or P2 issue remains.
- P3 intentional difference: the overlay is now visibly smaller than the supplied current-state screenshot, following the user's explicit request rather than cloning its previous dimensions.
- P3 intentional difference: the green markers keep a soft elevation shadow for separation from the parchment, but no dark-green border or outer ring remains.

## Required fidelity surfaces

- **Fonts and typography:** The overlay hierarchy and copy are preserved while desktop title, lede, archive labels, and values are reduced proportionally. Flat marker count text is 12.48px desktop / 11.2px mobile; marker names are 9.28px desktop / 8.64px mobile.
- **Spacing and layout rhythm:** The desktop overlay is 260px wide and approximately 351px high, with 20–22px padding and a 22px radius. Mobile remains within its viewport at 298px wide and approximately 252px high.
- **Colors and visual tokens:** The overlay uses the page's palest parchment yellow as `rgba(255, 244, 217, 0.5)`, with a matching light border and restrained blur. Text and map colors are unchanged.
- **Image quality and asset fidelity:** The existing parchment texture, Natural Earth geometry, and real album hover cover remain unchanged and sharp.
- **Copy and content:** Title, instructions, country archive rows, city names, photo counts, and album routes are unchanged.

## Comparison history

1. Initial state used a 300px desktop overlay with 26–28px padding, a 2.95rem title, a 74%-opaque white background, 58px green markers, a dark-green border, and an outer ring.
2. Final state reduces the overlay and its type hierarchy, applies the requested 50%-opaque pale-yellow surface, removes marker borders/rings, and reduces marker size to 48px desktop / 42px mobile. The post-fix full and focused comparisons show no remaining P0/P1/P2 issue.

## Primary interactions and responsive checks

- Dragged the flat map and confirmed the overlay's viewport position remained unchanged.
- Computed overlay z-index is 20, above the canvas and marker layers.
- Computed marker border width is 0px.
- Shanghai hover card still opens while the marker remains clickable.
- Reference-state, desktop, and mobile captures have zero horizontal/vertical document overflow and zero browser page errors.
- Production build and alternative-knowledge regression test passed; 133 pages generated.

final result: passed

# Photo-wall map entry and centered default globe QA

## Captures

- Photo wall desktop: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-centered-entry\photo-wall-desktop.png`
- Travel map desktop: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-centered-entry\travel-map-desktop.png`
- Photo wall mobile: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-centered-entry\photo-wall-mobile.png`
- Travel map mobile: `C:\Users\huawei\.codex\visualizations\2026\08\23\travel-map-centered-entry\travel-map-mobile.png`
- Local photo wall: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/photo-wall/?v=centered-globe1`
- Local travel map: `http://127.0.0.1:4342/officialwebsite/topics/space/travel/travel-map/?v=centered-globe1`

## Findings

- The fresh travel-map URL opens in `3D 地球` mode; `平面地图` is not selected.
- The globe is horizontally centered at 50% of the canvas while retaining its responsive vertical placement and reduced radius.
- `进入世界地图` appears directly below `把时间装进相册` and opens the existing independent travel-map route without a flat-view hash override.
- The entry remains visible and centered at 1440 × 900 and 390 × 844.
- Both destination viewports have no horizontal document overflow and no browser page errors.
- The production build and alternative-knowledge regression test passed; 133 pages generated.

final result: passed

# Travel map indigo palette QA

## Visual target

- Color reference: `D:\UserTemp\huawei\codex-clipboard-aec1a9e3-8abf-43eb-929a-a3bf4d69094f.png`
- Sampled reference blue: `#0A0C66` (average RGB 10, 12, 102).
- Globe and flat-map oceans use a restrained lighting gradient centered on the sampled indigo.
- Longitude and latitude grids are removed from both map modes.
- Continent and country labels use bright ivory/ice-blue fills with a dark indigo outline for contrast over both ocean and land.

## Verification

- Desktop viewport: 1440 × 900.
- Mobile viewport: 390 × 844.
- Globe and flat map checked for grid removal and label legibility.
- Orange visited-location markers remain unchanged.

# Travel map botanical green palette QA

## Visual target

- Color reference: `D:\UserTemp\huawei\codex-clipboard-c875d144-8dff-4515-b6ba-b2e5f5ceef52.png`
- Dominant sampled greens: deep forest `#18392B` / `#1E483A`, mid leaf `#557153`, pale leaf `#A8B197`.
- Ocean lighting is built from the deep forest-green range; continents use the low-saturation pale-leaf range.
- The existing ivory labels, dark outlines and warm orange location markers preserve readable contrast within the botanical palette.

## Verification

- Desktop viewport: 1440 × 900.
- Mobile viewport: 390 × 844.
- Globe and flat-map palettes checked independently.
- Dark-green refinement: ocean tones were deepened while the pale-green continent ramp remained unchanged to preserve clear land/sea separation.

# 旅行影像地图太空地球与国家统计 — Design QA

## Comparison target

- User layout reference: `D:\UserTemp\huawei\codex-clipboard-174a943c-0253-4489-a773-1e1715532782.png`
- User Earth mood reference: `D:\UserTemp\huawei\codex-clipboard-71826760-f706-4523-92f7-5b76ac63e23a.png`
- Blue Earth refinement reference: `D:\UserTemp\huawei\codex-clipboard-346888bf-0b9f-465d-a205-0381a0209755.png`
- Orbit palette reference: `D:\UserTemp\huawei\codex-clipboard-ce99a667-545f-4505-a73f-69ec8ea90ce0.png`
- Natural Earth palette reference: `D:\UserTemp\huawei\codex-clipboard-85580a20-4b36-4a92-888a-fc05d2e6821f.png`
- Electric blue Earth palette reference: `D:\UserTemp\huawei\codex-clipboard-851bc2e7-8a37-4ff3-8934-4747895ce0db.png`
- Desktop implementation: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\implementation-desktop.png`
- Side-by-side comparison: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\comparison-desktop.png`
- Mobile implementation checked at 390 × 844 in both globe and flat-map states.

## Findings and fixes

- P1 fixed: the former low-contrast globe read as a flat dark map. The final globe now uses a bright azure ocean body, ice-blue land, directional highlight and deep-blue night-side falloff without any external atmospheric halo.
- P1 fixed: the title previously wrapped a final Chinese character onto a third line. The title is now locked to two intentional lines with a stable left-column width.
- P1 fixed: the left column now derives country rows from the published location data and displays China, Jamaica and Japan with city and photo totals.
- P2 fixed: major continent and country names are projected through the same flat/globe coordinate functions, clipped to the visible hemisphere and depth-faded on the globe.
- P2 checked: desktop 1440 × 900 and mobile 390 × 844 show no horizontal overflow, clipped list rows, broken title wrapping or overlap with the bottom mode control.
- P3 intentional: the globe remains a live geographic projection rather than copying the watermarked raster Earth reference. The reference is used only for spherical lighting and blue color direction.

## Verification

- `npm run build`: passed; 133 routes generated and the existing alternative-knowledge regression test passed.
- `npm run lint`: the repository still reports 12 pre-existing diagnostics in unrelated album/reader files; no diagnostic was reported for `travel-map.astro`.
- Local route returned HTTP 200 and included both `COUNTRY ARCHIVE` and `travel-map-space-v2.png`.
- Globe screenshot checked at 1440 × 900; globe and flat states checked at 390 × 844.
- Blue-globe refinement rechecked at 1440 × 900 and 390 × 844: the rim is crisp, the external halo is removed, and the internal highlight/shadow remain clearly spherical.
- Orbit-palette refinement rechecked at 1440 × 900 and 390 × 844: ocean is deep cobalt/navy, land is ice white-blue, markers are cobalt, and the surrounding space remains near-black.
- Natural-palette refinement rechecked at 1440 × 900 and 390 × 844: ocean is muted indigo, land blends gray-white, olive and earth brown, and marker colors follow the indigo family.
- Electric-blue refinement rechecked at 1440 × 900 and 390 × 844: ocean is saturated cobalt/royal blue, land is cool white-blue, and marker colors follow the brighter cobalt family.
- Deep-blue/orange refinement rechecked at 1440 × 900 and 390 × 844: ocean is deep cobalt/navy, land remains cool white-blue, and all visited-location count markers use warm orange with brighter orange hover feedback.
- Flat-mode control selected correctly, all four markers remained visible, the country summary remained visible, and the document had no horizontal overflow.
- Country totals checked: 中国 2 城市 / 436 照片；牙买加 1 城市 / 2,154 照片；日本 1 城市 / 378 照片。

final result: passed

# 旅行影像地图 — Design QA

## Comparison target

- Source visual truth: `C:\Users\huawei\.codex\attachments\e834e06e-ab6a-415c-b887-939f048fa885\image-1.png`
- Implementation globe: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\globe-desktop.png`
- Implementation flat map: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\flat-desktop.png`
- Mobile globe: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\globe-mobile.png`
- Mobile flat map: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\flat-mobile.png`
- Side-by-side comparison: `C:\tmp\codex-stock-tracking-release-20260812-014333\tmp\travel-map-qa\source-vs-globe-desktop.png`

## Viewport and normalization

- Source pixels: 2880 × 1564; normalized with contain-fit onto a 1440 × 900 black canvas.
- Desktop implementation: 1440 × 900 CSS pixels, device scale factor 1.
- Mobile implementation: 390 × 844 CSS pixels, device scale factor 1.
- Compared state: dark 3D globe centered over Asia, with the zoom/recenter/view controls and photo-count markers visible.

## Full-view comparison evidence

The combined comparison preserves the reference's full-black canvas, right-weighted globe, dim country geometry, thin borders, left-side stacked controls, circular count markers, and strong negative space. The implementation intentionally replaces Immich's global-library clusters with the four published website albums and adds the site's mineral-earth typography, teal marker color, mode switch, statistics, and return link. These additions support the website context without changing the core map interaction.

The flat view uses the same real Natural Earth boundary source and exposes all four locations at once. At 390 × 844, the flat view keeps all four markers individually visible and clickable; the globe correctly hides Jamaica while it is on the rear hemisphere and reveals it after rotation.

## Focused region comparison evidence

The globe/control region was checked in the side-by-side image. Control order, globe silhouette, country-border density, dark tonal hierarchy, marker size, and marker count legibility align with the reference. The marker hover state was checked separately at 1440 × 900: it reveals the actual album cover, place name, region, and photo count without moving the globe.

## Required fidelity surfaces

- **Fonts and typography:** The implementation uses the site's serif display hierarchy for the title and compact sans-serif labels for map controls and coordinates. Counts remain legible at desktop and mobile sizes without truncation.
- **Spacing and layout rhythm:** The globe dominates the right side on desktop and recenters on mobile. Controls retain compact vertical grouping. No document-level horizontal overflow was detected at 1440 × 900 or 390 × 844.
- **Colors and visual tokens:** The source's black ground and low-luminance geography are preserved. Blue source markers are intentionally translated to the website's mineral teal, aqua, clay, sand, and warm-paper tokens.
- **Image quality and asset fidelity:** World boundaries come from the locally bundled Natural Earth 1:110m public-domain GeoJSON; album hover previews use the real published cover images. No placeholder map, emoji, or hotlinked runtime asset is used.
- **Copy and content:** The page shows four published locations and the exact album totals: 上海 310、海南三亚 126、牙买加 2,154、日本关东 378，共 2,968 张。

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- P3 intentional difference: the branded title and teal markers are added to fit the existing personal-album visual system; the source Immich screenshot has denser global-library clusters and place labels.

## Primary interactions tested

- Switch between `平面地图` and `3D 地球`; selected state and URL hash update.
- Drag the globe; latitude and longitude in the hash update.
- Zoom in and out; zoom in the hash updates.
- Reset the current view.
- Flat view shows all four locations; globe projection hides rear-hemisphere markers.
- Clicking each marker opens its correct Shanghai, Sanya, Jamaica, or Japan Kanto album route.
- Browser console errors: none after the favicon fix.

## Comparison history

1. Initial desktop pass: core globe composition and hover card passed; no P0/P1 issue.
2. Initial mobile flat pass found a P2 collision between the three East Asia markers and excess title obstruction. Fixed by hiding the display title in flat mode and adding mobile-only marker collision offsets.
3. Post-fix mobile capture shows four separate clickable markers with no document overflow. A favicon 404 found in automated QA was fixed; the final four-state capture reports zero console errors.

## Implementation checklist

- [x] Real flat world map with pan, zoom, reset, counts, and album links.
- [x] Real 3D globe projection with drag rotation, zoom, hemisphere visibility, counts, and album links.
- [x] Hash-addressable camera state for both map modes.
- [x] Desktop and mobile responsive layouts.
- [x] Four album destinations verified by actual clicks.
- [x] Side-by-side visual comparison and console check completed.

final result: passed

# Todo noir amber theme QA

## Visual comparison

- Source: `C:\Users\huawei\AppData\Local\Temp\codex-clipboard-1283e204-57da-4d22-8ee1-59533bac41d3.png`
- Implementation: `D:\Personal Data Huawei\Personal Data\AI\Projects\MyWebsite\tmp\screenshots\todo-noir-amber\todo-noir-reference-size.png`
- Side-by-side comparison: `D:\Personal Data Huawei\Personal Data\AI\Projects\MyWebsite\tmp\screenshots\todo-noir-amber\todo-noir-comparison.png`
- Local preview: `http://127.0.0.1:4321/officialwebsite/topics/space/planning/todo`
- Reference comparison viewport: 1664 × 946
- Desktop verification viewport: 1440 × 900
- Mobile verification viewport: 390 × 844

The reference and implementation were reviewed together at the same viewport. The implementation preserves the existing application geometry while matching the reference's black, charcoal, and warm-gold material language. Compared with the source, text, category colors, and task surfaces are intentionally brighter to meet the user's readability requirement.

## Findings

- P0: none. No route, data structure, API, task rendering, or interaction logic was changed.
- P1: none after iteration. Theme startup, three-state cycling, persistence, modal proportions, seven-column board, and mobile sidebar all passed.
- P2: seeded QA task content differs from the reference's real account data; this is intentional so the isolated browser did not read or modify production tasks.

## Verification

- `npm run lint`: passed, 0 errors, 0 warnings, 0 hints.
- `npm run test:todo-modal`: passed, including noir amber theme cycling and reload persistence.
- `npm run build`: passed, 93 pages generated.
- Reference-size 1664 × 946: no horizontal overflow, clipping, or layout movement.
- Desktop 1440 × 900: task creation modal stayed within the viewport.
- Mobile 390 × 844: sidebar opened normally and no horizontal overflow was present.
- Seven day columns remained rendered and task items remained draggable.
- Browser console and page errors: none.

final result: passed
