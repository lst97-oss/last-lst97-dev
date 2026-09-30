# LAST//OS v0.2.2

One commit since [v0.2.1](https://github.com/lst97-oss/last-lst97-dev-web/releases/tag/v0.2.1): the mobile view could not scroll. The home page and every other page were clipped at the fold and unreachable on a phone. This release fixes the scroll architecture and repairs the navigation dock it exposed.

## Mobile scrolling

Nothing scrolled on a phone. The desktop shell root is `h-dvh overflow-hidden` so the workspace `ScrollArea` can own the page scroll — correct on desktop, fatal on mobile, where the document was clamped to exactly one viewport (`scrollHeight === clientHeight === 844`) while the content column grew to 3930px. The overflow was discarded, not merely hard to reach.

Mobile now has two scroll models, chosen by whether the page contains a `scrollable` window frame:

- **Home has no scrollable frame**, so `.os-site` releases the clamp (`height: auto`, `min-height: 100dvh`, `overflow-x: clip`, `overflow-y: visible`) and `<body>` scrolls. `overflow-x: clip` is deliberate: `auto` would turn the shell into a second scroller competing with the page, and `visible` alone would let the decorative background spill.
- **Chat, contact, and every list/detail page have one**, so `.os-site:has(.window-frame--scroll)` re-applies the clamp and the frame's themed `ScrollArea` stays the only reachable scroller.

`chat` and `contact` were not passing the `scrollable` prop, so both silently fell back to the page model and leaked a 23px page scroll past the frame — two nested scrollers on one screen. They now pass it, matching the mechanism `projects.$slug` already used.

## Navigation dock

The dock was rebuilt on the custom `ScrollArea` to get the themed scrollbar, which surfaced three defects:

- **It stopped being `position: fixed`.** `ScrollArea` bakes Tailwind's `relative` into its own root class list, and Tailwind's `utilities` layer outranks the unlayered `shell.css`. The dock became a grid item stretched to its row and bounded only by `max-height`, painting a full-height translucent column down the screen. Fixed with `position: fixed !important` plus `min-height: 0`.
- **A horizontal scrollbar appeared.** `overflow-y: auto` computes `overflow-x` to `auto` per the CSS overflow spec. The themed bar owns the vertical axis; x is now `clip`. The narrow width also moves 82px → 90px, because the viewport is border-box and 82px left 64px of content for 72px children.
- **The icons were left-aligned.** Radix renders viewport children inside a wrapper carrying an **inline** `style="display: table"`, which no stylesheet rule can outrank at normal specificity, and which is not a flex container — so `align-items` and `gap` never reached the shortcuts.

The selected item now takes a border, matching the mobile bottom sheet's `.os-mobile-dock-item`. It is `border-transparent` at rest and only its colour changes, so nothing reflows when you navigate.

## Chat transcript on mobile

The avatar occupied its own flex column beside every message, costing ~2.5rem of a 390px viewport. Below `sm` it is dropped and the same `YOU` / `SYS` label moves inline into the header, so replies use the full card width.

## Verification

- `bun test` — **759 pass, 3 skip, 0 fail** across 126 files (2954 assertions)
- `bunx tsc --noEmit` — **0 errors**
- `bun run check:server` and `bun run imports:check` — clean
- `npx react-doctor@latest` (root scan) — **100/100, no issues found**
- Measured in headless Chromium at 390×844: home `docScrollHeight 4001` and scrolls; `/projects`, `/blog`, `/changelog`, `/chat`, `/contact` all keep `docScrollHeight === innerHeight` while their frame viewport scrolls
- Dock measured at 1440px, 900px, and 768px: `position: fixed`, 110px/90px wide, items centred (left 11 / right 11 and 9 / 9), no horizontal scroll at any width
- New regression tests in `tests/window-frame-styles.test.ts` pin both scroll models, the dock's `!important` positioning, its `overflow-x: clip`, and the arithmetic that the dock must fit its own children

## Known issues

- **This release is not deployed.** Production was probed at write time and still serves the previous build, so every `/` `/about` `/projects` `/blog` `/changelog` `/chat` `/contact` returns 200 and `/nope` returns 404 exactly as in v0.2.1. The mobile fix is verified locally only. The CSS and JSX are the whole change, so the first preview build is the real check.
- **The `useCallback` / `resolveDispatcher() is null` error reported on `/contact` could not be reproduced.** Cold load, HMR reload, and real SPA navigation (home → contact → chat → contact) all rendered clean with zero page errors. It did not appear once across any of those paths. Two Vite dev servers were simultaneously bound to port 3000 (PID 28190 on IPv6, 30132 on IPv4), and that contention is a plausible cause; the browser checks here ran against `127.0.0.1`. This is unresolved, not disproven.
- **The authenticated 403 fix from v0.2.1 is still unverified end to end.** The env values, live `serverURL`, 404 status, and the unauthenticated-write negative control all hold, but no authenticated write has been exercised because it needs a real Payload session. An admin-UI create of a Topic remains the exact check that would close it out.
- **The 3 skips are not coverage.** They are the two pgvector integration blocks, which stay skipped unless `KNOWLEDGE_TEST_DATABASE_URL` is exported. That variable is absent from `.env.example`; it is documented at `docs/knowledge-rag.md`.
- **The dock's `!important` is load-bearing and fragile.** It exists to outrank a Tailwind utility that `ScrollArea` applies itself, and the centering override targets Radix's internal wrapper markup. A Radix or Tailwind upgrade that changes either could break the dock quietly, the same way this release fixed it. The durable fix is a `viewportProps` escape hatch on the `ScrollArea` primitive instead of styling around its internals.
- **The happy-dom style tests cannot see this class of bug.** The dock regression passed while the real page was broken, because happy-dom does not load Tailwind's `utilities` layer and so reported the correct computed `position`. The replacement assertion reads the declaration from source. Other computed-style assertions in the suite may have the same blind spot.
- **The CMS tables are still empty**, as in v0.2.0 and v0.2.1. The schema is migrated but nothing is seeded.

## Docs

- [`AGENTS.md`](https://github.com/lst97-oss/last-lst97-dev/blob/main/AGENTS.md) — repository conventions, verification traps
- [`src/styles/shell.css`](https://github.com/lst97-oss/last-lst97-dev/blob/main/src/styles/shell.css) — dock positioning and the scrollable-frame contract, with the cascade traps documented inline

## Licence

MIT — Copyright (c) 2026 Sio Tou Lai.
