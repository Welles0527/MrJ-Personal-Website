# 待办页原布局咖啡风格 QA

- Source layout truth: `C:/Users/huawei/AppData/Local/Temp/codex-clipboard-f3c33240-c690-439a-98ab-efcd507ba850.png`
- Style reference: `C:/Users/huawei/AppData/Local/Temp/codex-clipboard-2c0d7b4b-ff56-4e0c-8ea9-222a9007cac9.png`
- Implementation: `http://127.0.0.1:4321/officialwebsite/topics/space/planning/todo`
- Desktop screenshot: in-session Puppeteer capture `todo-original-layout-coffee-1440x900-pass1` at `1440x900`.
- Mobile screenshot: in-session Puppeteer capture `todo-original-layout-coffee-mobile-390x844` at `390x844`.
- State: login dialog closed for layout comparison; current week sample tasks visible.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- [P3] The source layout uses a cleaner blue accent system; the implementation intentionally keeps the coffee-paper palette and brown controls from the newer style reference.
- [P3] The source screenshot is logged in. The implementation keeps the existing auth behavior, so anonymous sessions may see the login dialog first.

**Required Fidelity Surfaces**

- Fonts and typography: the original wide hierarchy is restored with the coffee-style handwritten heading and unified day-card UI text.
- Spacing and layout rhythm: desktop is back to top filters, data tools, full-width planner, and seven-column weekly board. The today clipboard is hidden from this layout.
- Navigation: desktop keeps the coffee leather left sidebar; mobile keeps it as a slide-out drawer with no exposed edge when closed.
- Colors and visual tokens: beige paper background, coffee-brown primary actions, soft category pills, and warm card shadows carry the current coffee feeling.
- Image quality and asset fidelity: no raster assets were introduced. Existing decorative coffee marks are restrained so they do not obscure controls.
- Copy and content: Chinese labels, category names, date ranges, add/edit/delete, export, completion, and stats remain dynamic.

**Patches Made Since Previous QA Pass**

- Restored the original desktop information layout.
- Restored the desktop left navigation sidebar.
- Re-added the data tools/export row.
- Hid the desktop today clipboard so the seven-day board is primary again.
- Preserved the coffee visual system through color, paper texture, rounded panels, and brown controls.
- Verified daily-card plus button hit areas and mobile drawer behavior.

**Implementation Checklist**

- [x] Compare desktop layout at `1440x900`.
- [x] Check mobile layout at `390x844`.
- [x] Verify no horizontal overflow in checked viewports.
- [x] Verify daily-card `+` opens the add modal.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.

**Follow-up Polish**

- If the final direction keeps this layout, the next polish pass can tune exact column heights and paper texture intensity against the current production viewport.

final result: passed
