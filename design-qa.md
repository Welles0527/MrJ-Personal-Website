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
