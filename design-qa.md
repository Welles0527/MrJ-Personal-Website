# 相册首页中文标题批注 — 2026-09-05 Design QA

## Target and scope

- Source visual truth: the three browser annotations on `http://127.0.0.1:4415/officialwebsite/topics/space/travel/photo-wall/`, requesting the cover title `J先生旅行相册`, Chinese album titles, date-only subtitle lines, and removal of the duplicated date/location line.
- Same-layout baseline: `C:/Users/huawei/.codex/visualizations/2026/09/04/photo-wall-globe-entry/desktop-1440x900-puppeteer.png` — 1440 × 900 px.
- Implementation URL: `http://127.0.0.1:4415/officialwebsite/topics/space/travel/photo-wall/?v=cncopy-final`.
- Final desktop implementation: `C:/Users/huawei/.codex/visualizations/2026/09/05/photo-wall-cn-copy/desktop-1440x900-edge.png` — 1440 × 900 CSS px and image px, device pixel ratio 1, initial scroll position.
- Final mobile implementation: Puppeteer artifact `photo-wall-cn-copy-mobile-final2` — 390 × 844 CSS px and image px, initial scroll position.

## Full-view and focused comparison evidence

- The 1440 × 900 baseline and final desktop capture were opened together in the same comparison input. The cover, two-column book rhythm, filters, world-map icon, photos, margins, and surrounding page remained fixed while only the annotated copy changed.
- A focused lower-page browser capture, `photo-wall-cn-copy-desktop-lower`, shows all four final title/date pairs: `海南三亚 / 2016`, `日本关东 / 2015`, `牙买加 / 2004–2005`, and `上海 / 2013–2026`; no former date/location line remains below them.
- The edited cover asset was inspected at its native 1122 × 1402 px. The exact Chinese title is legible without乱码; the book, architecture, cyan palette, texture, shadow, composition, and two small subtitle lines remain aligned with the original asset.
- The 390 × 844 mobile capture was inspected separately because the supplied browser annotations show a desktop viewport. It confirms the longer Chinese cover title and card title/date pair remain inside their surfaces without clipping or horizontal page overflow.

## Required fidelity surfaces

- Fonts/typography: the cover title is embedded cleanly in the image. Album headings now use the existing square Chinese sans-serif stack at a restrained editorial weight; dates use the existing serif numeric treatment with consistent spacing. No title wraps or stretches abnormally.
- Spacing/layout: the removed duplicate line gives the description a cleaner start while preserving the original card height, paper gutter, inset-photo area, and row rhythm.
- Colors/tokens: cover and card title colors remain the established black and muted teal; no palette token or surrounding component changed.
- Image quality: `wanderlust-cover-cn-v1.png` is a non-destructive ImageGen text-localization edit of the original cover. It stays 1122 × 1402 px and is referenced as a real raster asset rather than an HTML/CSS overlay.
- Copy/content: all four display headings are Chinese; every subtitle is a date or date range; the repeated date/location paragraph was removed. Album counts, notes, captions, real photos, URLs, filter regions, and map destination are unchanged.

## Findings and comparison history

1. Initial post-edit desktop and lower-page inspection: no actionable P0/P1/P2 mismatch. All three annotated changes are visible and the four cards remain balanced.
2. Mobile inspection: no clipping, overlap, abnormal wrapping, or horizontal document overflow. No additional visual fix was required.
3. Accepted date convention: the Shanghai coffee album uses `2013–2026`, the range represented by its dated source photos; the other three dates follow their existing album names and source periods.

## Interaction and code verification

- DOM verification found four Chinese titles, four date values, zero `.place-name` duplicate rows, and zero English album-title strings.
- All four existing album hrefs remain unchanged.
- Domestic filter script verification returns only `海南三亚` and `上海`; the core filter logic and accessibility state remain unchanged.
- Desktop and mobile document checks found no horizontal overflow.
- All 17 page images, including the new cover, decoded successfully in the browser; the cover reports its expected 1122 × 1402 natural size.
- Scoped Astro check: 1 file, 0 errors, 0 warnings.
- No route, dataset, map, dependency, commit, push, or deployment change was made.

final result: passed

---

# 相册首页世界地图图标入口 — 2026-09-04 Design QA

## Target and scope

- Source visual truth: `D:/UserTemp/huawei/codex-clipboard-92e75ee7-b337-4e23-8462-d7db64bf92c2.png` (1488 × 1562) for the preserved world-map entry and `D:/UserTemp/huawei/codex-clipboard-0dd57b79-420f-4b1e-9d98-97a8437e9498.png` (722 × 494) for the icy cyan/gray page palette.
- Implementation URL: `http://127.0.0.1:4415/officialwebsite/topics/space/travel/photo-wall/`.
- Scope: replace the top-right `3D / 进入世界地图` text control with a palette-matched globe icon while preserving the existing map route and page.

## Captured evidence

- Desktop implementation: `C:/Users/huawei/.codex/visualizations/2026/09/04/photo-wall-globe-entry/desktop-1440x900-puppeteer.png` — 1440 × 900 CSS px and image px, device pixel ratio 1, initial scroll position.
- Mobile implementation: `C:/Users/huawei/.codex/visualizations/2026/09/04/photo-wall-globe-entry/mobile-390x844-puppeteer.png` — 390 × 844 CSS px and image px, device pixel ratio 1, initial scroll position.
- Focused icon capture: `C:/Users/huawei/.codex/visualizations/2026/09/04/photo-wall-globe-entry/globe-entry-48x48-puppeteer.png` — 48 × 48 px.
- The cyan book reference and final desktop render were opened together in the same comparison input. The focused crop was then inspected at native size for line weight, contrast, circular geometry, and surrounding space.

## Required fidelity surfaces

- Fonts/typography: no visible navigation copy was added; the accessible name and native tooltip remain `进入世界地图`. Existing page typography is unchanged.
- Spacing/layout: the icon is a 48 × 48 px circular control in the existing top-right slot. It does not move the centered book or filter layout and remains fully visible at both verified viewports.
- Colors/tokens: translucent ice-cyan fill, blue-gray stroke, deep teal globe line, and a restrained cool shadow reuse the cover and editorial ink palette.
- Image/icon quality: the globe is the installed Tabler `IconWorld`, not a text glyph, emoji, placeholder, inline custom SVG, or CSS drawing. The 1.35 px stroke stays crisp at native size.
- Copy/content: the world-map destination and map page are unchanged. The visible text was intentionally replaced by the requested globe graphic; screen-reader and tooltip copy preserve the action meaning.

## Findings and comparison history

1. Initial final comparison: no actionable P0/P1/P2 mismatch. The globe entry is visually distinct, palette-consistent, and readable without competing with the centered cover.
2. Accepted difference: neither supplied reference contains a globe illustration matching this exact control. The implementation therefore uses the project's installed icon library and derives its colors from the supplied cyan travel-book reference.

## Interaction and code verification

- Desktop 1440 × 900: no horizontal overflow; icon measures 48 × 48 px.
- Mobile 390 × 844: no horizontal overflow; icon is fully within the viewport and exceeds the 44 × 44 px minimum touch target.
- The link exposes `aria-label="进入世界地图"`, a matching title, and a real SVG icon.
- Clicked the globe entry from the album homepage: navigated to `/officialwebsite/topics/space/travel/travel-map/`; the destination loaded with title `旅行影像地图 · J先生的个人空间` and its canvas present.
- Browser console output during the checked navigation was empty.
- Scoped Astro check: 1 file, 0 errors, 0 warnings.
- No route, data, album card, map implementation, dependency, commit, push, or deployment change was made.

final result: passed

---

# 旅行相册画册布局 — 2026-09-01 Design QA

## Target and scope

- Source visual truth: `D:/UserTemp/huawei/codex-clipboard-a792941d-f1fa-49f8-94a2-23f9b8b39444.png` (736 × 1312).
- Implementation: `http://127.0.0.1:4415/officialwebsite/topics/space/travel/photo-wall/`.
- Source: `src/pages/topics/space/travel/photo-wall.astro` in `C:/tmp/codex-resume-label-release-20260831-local`.
- The main MyWebsite checkout contains an old placeholder for this page and unrelated pending changes. This implementation uses the existing clean checkout whose album page matched the live page; the old placeholder and unrelated edits were not touched.
- Layout target: a centered cyan hardback cover, then two columns of open travel magazines on a cool gray desk. Preserve the real four albums, photos, domestic/overseas filtering and world-map entry. No route, data schema, detail-page, dependency or deployment changes.

## Captured evidence

All captures use device pixel ratio 1, with no browser chrome; pixel dimensions equal CSS viewport dimensions. The in-app browser automation surface was not exposed, so the available Puppeteer browser was used. The development toolbar was removed only in the browser for clean captures.

- Same-size reference comparison: `C:/Users/huawei/.codex/visualizations/2026/09/01/album-editorial/reference-final.png` — 736 × 1312, all four albums visible.
- Desktop: `C:/Users/huawei/.codex/visualizations/2026/09/01/album-editorial/desktop-final.png` — 1440 × 900, initial scroll position.
- Focused spread comparison: `C:/Users/huawei/.codex/visualizations/2026/09/01/album-editorial/spreads-final.png` — 1440 × 900, scrolled to the four open spreads. Checked title lettering, image crops, page gutters, folios and text/image spacing against the reference's spread regions.
- Mobile: `C:/Users/huawei/.codex/visualizations/2026/09/01/album-editorial/mobile-final.png` — 390 × 844, initial position after the overflow fix.
- The original reference and the final 736 × 1312 implementation were opened together in one comparison input, not judged solely from code or separate remembered views.

## Comparison history

1. Initial rendered pass: blocked. [P2] First row began at y522 instead of the reference's y411. [P2] Fallback lettering was too broad, causing long titles to wrap and squeeze the inset photos. Fixed cover sizing, moved the filter bar into the available side space beneath the cover, bundled a condensed display font, shortened the long English headings and removed the second descriptive paragraph.
2. Same-size recapture: first-row boxes are x38/y410.7 and x385/y410.7, both 313 × 247.8. These match the reference spread positions and proportions closely. [P2] One Shanghai photo was mostly blank at its portrait crop; replaced it with another existing, visually inspected latte photo. Lazy images were explicitly decoded before final capture.
3. Mobile pass: [P2] The decorative paper/shadow asset extended the scroll width to 400px on a 390px viewport. Added a padded clipping area around the mobile grid, preserving book content and shadows inside the viewport. Post-fix document width is 390px, and every page footer remains inside its book.
4. Final reference, desktop spread and mobile captures inspected: no remaining actionable P0/P1/P2 findings.

## Required fidelity surfaces

- Fonts/typography: condensed teal uppercase headings now use locally hosted Bebas Neue, matching the reference's tall editorial character. Chinese descriptions use a compact sans-serif; Chinese location names use a restrained serif. No abnormal stretching or broken title lines observed. Desktop and mobile labels remain fully inside the page surfaces.
- Spacing/layout: centered cover, two-column spread grid, near-identical reference-width spread boxes, natural paper gutter and generous row spacing. Mobile intentionally becomes one column while retaining both facing pages. No horizontal scrolling, unintended overlap or cut-off interactive content remains.
- Colors/tokens: #cfd0d2 desk, pale cyan cover, white paper, #2d7887 headings, blue/gray photo treatment. Gray edges of generated artwork are lightly feathered into the desk; no visible checkerboard or abrupt background rectangle.
- Image quality: generated cover and blank paper assets provide actual raster book texture and shadow rather than drawn substitutes. Real cover and inset photos come from the four unchanged album datasets. All 17 image elements decoded successfully. Portrait crop choices were visually inspected; the Jamaica timestamp is part of the user's original photograph and was preserved.
- Copy/content: four authentic albums and 2,968 photos, not six invented destinations. Chinese album names, image counts and routes are unchanged. Descriptive copy is short and consistent with the existing album descriptions. English display titles provide the reference's editorial hierarchy without copying its gibberish text.
- Accessibility: real links and native filter buttons, aria-pressed states, polite filter status, skip link, visible keyboard focus, reduced-motion handling, meaningful cover alt text and decorative images excluded from accessibility. Buttons retain 44px minimum height.

## Interaction and code verification

- Clicked 国内: only 三亚 and 上海 shown; selected state/status updated.
- Clicked 国外: only 日本 and 牙买加 shown; selected state updated.
- Clicked 全部: four albums restored.
- Clicked the 三亚 book: navigated to the existing 三亚 page and verified its title/heading.
- Clicked 3D/world-map entry: navigated to the existing travel-map route and verified its title.
- All four album URLs, the album homepage and the world-map URL returned HTTP 200.
- Focused the filter button and checked visible focus. No page error/unhandled rejection was recorded during the final filter interaction pass; no errors appeared in the browser tool's console output during those interactions.
- `git diff --check` passed.
- Scoped `npm run lint -- --tsconfig C:/Users/huawei/.codex/visualizations/2026/09/01/album-editorial/tsconfig.json --minimumSeverity warning`: 1 file, 0 errors, 0 warnings.
- An earlier directory-scoped Astro check picked up 74 files and reported 12 existing type errors in album detail pages and bible-reader.ts. Those unrelated files were not changed. The targeted single-page check is the verification for this change; no full-site build or deployment was performed.
- The directory-scoped check also created ignored `.astro` and `node_modules` cache folders inside the travel directory. An attempted cleanup was blocked by the environment policy; these ignored generated caches are not part of the source diff.

## Asset provenance

- `public/images/photo-wall/editorial/wanderlust-cover-v1.png`, 1122 × 1402: built-in ImageGen. Prompt: standalone pale-cyan hardback travel book matching the reference, directly overhead, architectural cathedral cover, exact WANDERLUST / A JOURNEY THROUGH TRAVEL / J'S TRAVEL JOURNAL text, realistic left spine and soft cast shadow, plain #cfd0d2 background, no other objects.
- `public/images/photo-wall/editorial/open-pages-v1.png`, 1409 × 1117: built-in ImageGen. Prompt: completely blank open magazine, straight overhead, spread aspect 1.263, central gutter, white paper grain, thin layered edges and soft down/left shadow; solid #cfd0d2 surroundings, no text, illustrations or photographs. Actual HTML content is aligned over the page surfaces.
- Both assets are opaque raster images with slight gray background variation, blended at the outer edges. They are decorative artwork, not represented as the user's travel photographs.
- `public/images/photo-wall/editorial/BebasNeue-Regular.ttf` and `BebasNeue-OFL.txt`: [Google Fonts source and license](https://github.com/google/fonts/tree/main/ofl/bebasneue), served locally with no runtime font network request or new package dependency.

## Accepted differences and next step

- Four existing books occupy two rows, versus six illustrative books in the reference. The existing archive was preserved rather than inventing trips or duplicating albums.
- Reference European landmark photos are replaced by the user's own album images; decorative cover artwork is recreated, not pixel-identical.
- Small navigation and filters remain as usable web controls although the reference is a static print mockup.
- P3: subtle paper curl and cover architecture differ from the static reference. These do not affect the selected layout or interactions.
- Local review only. No commit, push or production publication in this task.

final result: passed

---

# Earlier QA records (preserved)

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

---

# 上证指数技术共振监测 V2 — Design QA

## Source truth and capture state

- Source reference: `D:/Downloads/shanghai_index_signal_v2_demo.html`.
- Implemented route: `http://127.0.0.1:9462/officialwebsite/stock-tracking/?stock=301026&view=market&period=day`.
- Desktop reference and implementation were captured at 1440 × 900 CSS pixels with device scale factor 1.
- Mobile implementation was captured at 390 × 844 CSS pixels with device scale factor 1.
- Comparison state: current scenario, real market quote loaded, day period selected. Astro's development toolbar was hidden; no product content was removed.
- Evidence:
  - `tmp/market-v2-qa/reference-1440x900.png`
  - `tmp/market-v2-qa/implementation-1440x900-final.png`
  - `tmp/market-v2-qa/implementation-mobile-390x844-final.png`
  - `tmp/market-v2-qa/comparison-1440x900-final.png`
  - `tmp/market-v2-qa/comparison-focus-final.png`

## Fidelity review

- Typography: restored the demo's compact information hierarchy, uppercase micro-labels, high-contrast Chinese headings and restrained metadata scale without changing the site's existing font stack.
- Layout and spacing: reproduced the header strip, 64/36 chart-and-decision grid, 65/35 matrix-and-evidence grid, ring metrics, four-stage state rail and compact condition cards. The desktop rows align and the responsive view collapses into one column without document-level horizontal overflow.
- Color and surfaces: matched the near-black/navy panels, thin cool-gray borders, blue-violet structure accents, teal confirmations, amber setup/risk accents and red failure states. Shadows remain subtle and do not obscure chart lines or labels.
- Data and copy: demo-only synthetic values were replaced with the existing real Shanghai Composite quote, candles, technical scores and support/confirmation levels. Market breadth is shown as `--` because the provider does not expose constituent breadth; coverage and confidence are reduced instead of fabricating data.
- Assets and chart quality: retained vector UI icons and rendered the price/MA chart from real period candles at the viewport's native resolution. No rasterized demo text or low-resolution substitute assets were introduced.

## Interaction and responsive review

- Current, opportunity-confirmation and risk-deterioration scenarios switch the decision state while preserving the real quote; projected scenarios are explicitly labelled as conditional simulations.
- Day/week/month/quarter/year controls update the URL, selected-period legend and real candle series.
- Chart tooltip appears on hover and clears after pointer leave; no shadow or tooltip residue remains.
- Desktop width: 1440px document/client widths match. Mobile width: 390px document/client widths match; the dense matrix scroll is contained inside its own panel.
- No page errors or console errors were observed in the final desktop and mobile capture runs.

## Findings and iteration history

1. P2 — the first chart pass was taller than the reference and pushed the matrix below the intended fold. Reduced only the market V2 chart height and rechecked desktop/mobile proportions.
2. P1 — unavailable breadth values were initially formatted as zero. Corrected missing-value handling so unavailable data stays `--`, and the model reports 5/6-source coverage rather than false precision.
3. P1 — the confirmation scenario could stop at TRIGGER. Tightened the scenario projection so the confirmation control deterministically demonstrates CONFIRMED and the risk control demonstrates FAILED, without mutating live quote data.
4. Final full-view and focused comparisons found no remaining P0/P1/P2 issue. The existing application navigation is intentionally retained above the reproduced dashboard.

## Verification

- `node --check public/stock-tracking/technical-analysis-page.js` — passed.
- `node --check public/stock-tracking/technical-analysis-chart.js` — passed.
- `node tests/market-score-matrix-contract.mjs` — passed.
- `node tests/stock-technical-analysis-engine.cjs` — passed (47 cases).
- `npm run build` — passed; 134 pages built and the existing alternative-knowledge regression passed.
- `npm run lint` — blocked by 12 pre-existing TypeScript errors in unrelated travel photo-wall and Bible reader files; no error points to the four files in this change.
- Edge via Playwright in a user-approved isolated browser session: 1440 × 900 and 390 × 844 visual checks, real-data wait, scenario/period controls, tooltip dismissal and overflow checks — passed.

final result: passed

# 今日必读 — Noir / warm gold style update (2026-09-01)

## Scope and visual target

- User reference: `D:/UserTemp/huawei/codex-clipboard-a7a9a579-3945-4adc-8777-9c9713bc536b.png` (1024 × 1536).
- Local preview: `http://127.0.0.1:9341/officialwebsite/stock-tracking/?stock=301026&view=daily`.
- Changed core files: `public/stock-tracking/styles.css`, `public/stock-tracking/app.js`, `src/pages/stock-tracking/index.astro`.
- Regression assertions: `tests/stock-tracking-daily-stock-layout.mjs`.
- Scope is a visual-language transfer, not a clone of the reference's productivity product. Preserve 今日要闻 → 个股重大消息 → 个股红绿灯, actual data, left-watchlist filtering and all existing destinations. The hooded portrait, productivity metrics and unrelated widgets are intentionally not imported.
- No dependencies, data-generation rules, watchlist storage, stock judgments or routes changed. Not committed or published.

## Evidence and comparison

Evidence directory: `C:/Users/huawei/.codex/visualizations/2026/08/09/019fe72b-6b94-7b01-8ea0-e4e8740af958/daily-noir-20260831/`.

- `baseline-desktop.png`: previous appearance, 1440 × 900 viewport, full-page capture.
- `desktop-final.png` / `desktop-viewport.png`: final full-page and first-viewport captures, 1440 × 900 viewport.
- `mobile-final.png`: final full-page capture, 390 × 844 viewport.
- `traffic-final.png`: focused six-dimension traffic-light region.
- `comparison-full.png`: reference and implementation in one image, reviewed for overall density, surfaces and hierarchy.
- `comparison-detail.png`: reference dashboard cards and implemented traffic-light card together, reviewed for typography, icons, borders, spacing and semantic colors.
- Final screenshots hide only Astro's development toolbar, not application content.

## Fidelity review

- Palette: near-black `#090a0b` canvas, matte `#121314` content cards, `#0d0e0f` navigation, muted gold `#c4a16a` interactive accents. Removed the daily view's purple selection, gray canvas and pronounced shadows.
- Geometry: 12px outer cards, 8px controls, thin `#292a2b` dividers and consistent 16px section spacing. All three desktop cards align at x=294 with width=1126; mobile cards align at x=10 with width=370.
- Typography: retain the existing Chinese UI font stack; 30px leading headline, 23px section titles, 15–16px readable message copy, subdued metadata. No condensed-English font substitution or stretched text.
- Density: all messages remain present (82 in the verified live state); the message region scrolls within a 460px desktop / 520px mobile maximum height so the traffic light is not buried below thousands of pixels of history. No duplicate filter row was added.
- Icons: reuse existing line icons; navigation, watchlist controls, message badges/checks/source links and all six traffic dimensions were visibly rendered. No substitute imagery, new SVG artwork or icon dependencies.
- Risk semantics: positive traffic-light signals remain green, negative signals red and unknown/awaiting evidence yellow. Gold denotes navigation and presentation, not an investment classification. Corrected the daily legend's inherited market-price color collision.

## Findings and iteration history

1. Initial pass found a higher-specificity legacy gradient on the navigation shell. Increased only the daily-scoped selector specificity and checked a fresh page load; the shell now computes to solid `rgb(13, 14, 15)`.
2. Initial captures were taken before asynchronous real messages loaded. Final evidence waits for actual message rows and includes the complete scrollable list.
3. The first keyboard-scroll assertion sampled before the native scroll animation finished. Waiting for positive scrollTop confirms PageDown works (401px observed); no application change was needed.
4. User continuation restarted the tool runtime and the preview process was no longer listening. Restarted the Astro preview and reverified HTML, CSS and JS each returned HTTP 200.
5. Full-view and focused combined-image review: no remaining P0/P1/P2 visual issue within the style-transfer scope. Mobile intentionally converts the traffic table to labeled stacked rows; horizontally scrollable navigation/filter strips remain functional.

## Verification

- `node --check public/stock-tracking/app.js` — passed.
- `node tests/stock-tracking-daily-stock-layout.mjs` — passed, including theme scoping, keyboard-focus markup, six-dimension/data-boundary tests and red/green legend colors.
- `git diff --check` — passed (only normal LF/CRLF conversion notices).
- Edge via Playwright in an isolated session, explicitly approved by the user: 1440 × 900, 768 × 1024 and 390 × 844. Document/body width equals viewport width; no daily section content overflow.
- Clicking a stock on desktop/mobile stays on `view=daily`, scopes major messages and updates the selected-stock traffic light. “全部自选股” restores all messages.
- One today's-message checkbox was marked read and then restored to unread. Only the isolated local session was used; no signed-in user data was changed.
- Focused message region accepts keyboard PageDown. All messages remain reachable; source links remain visible.
- Navigating to 个股日历 removes the daily theme class and retains its original palette.
- No browser page errors observed. Astro successfully served the changed page; a full-site production build was not run for this scoped CSS/markup change.

final result: passed
