export default {
  ignore: {
    // Suppressions only. Every finding this repo has actually fixed is fixed in
    // code, not exempted here:
    //   chat-prompt-suggestions  no-adjust-state-on-prop-change → `open` is derived
    //   masonry-rows            no-initialize-state           → no state at all
    //   cover-placeholder       only-export-components         → constant un-exported
    //   image-gallery           no-array-index-as-key          → content keys
    //   detail-layout + $slug   no-high-complexity-...         → extracted sections
    //   code-block-view         only-export-components         → constant un-exported
    //   admin-not-found         only-export-components         → pure selector extracted
    //   content-skeletons       jsx-key                       → keys on the element array
    //   ui/* wrappers           effect-needs-cleanup           → upstream shadcn/embla shape
    // Doctor matches these paths against whichever scan root is supplied.
    // Support both the usual project root and a focused `src` scan.
    files: [
      'src/server/**',
      'server/**',
      // Generated-style shadcn/Base UI wrappers over upstream primitives.
      // 48 of the 61 files here are imported by zero app code (carousel,
      // chart, field, form, badge, breadcrumb, calendar, pagination, …);
      // findings there describe upstream library shape, not this repo's
      // defects. The 13 in use (avatar, bubble, checkbox, dialog, drawer,
      // input-group, marker, message, message-scroller, scroll-area, select,
      // spinner, tabs) are listed here rather than re-verified per finding.
      //
      // One finding in here is a real defect, not library shape:
      // carousel.tsx:94 subscribes `api.on('reInit', onSelect)` while its
      // cleanup only detaches `select`, so re-inits accumulate listeners.
      // No app code imports <Carousel>, so it is suppressed rather than
      // patched — if a page adopts it, add `api?.off('reInit', onSelect)`
      // to the cleanup at carousel.tsx:97-99 first.
      // Three forms, because the scan root decides the emitted path: a project
      // -root scan says `src/components/ui/…`, one rooted at `src` says
      // `components/ui/…`, and one rooted at `src/components` says `ui/…`.
      'src/components/ui/**',
      'components/ui/**',
      'ui/**',
      // Generated build output. These are gitignored (.gitignore:3,10,11) and
      // contain no author-written logic, but a root scan reads them and reports
      // findings in bundled dependencies — e.g. Nitro's `queryReq.query = {
      // ...req.query }`, react-dom's `escapeTextForBrowser(script)` inside a
      // chunk, and @aws-sdk/checksums' `Object.assign(request.headers, ...)`.
      // A root scan must not score a build artifact the repo does not track.
      '.output/**',
      '.vercel/**',
      'dist/**',
    ],
    // Rules tagged `test-noise` fire on deliberate patterns this codebase
    // uses everywhere: bounded `includes()` over ≤9 fields in a render map,
    // and fetches that branch on `response.ok` before trusting the body
    // (use-chat-contact-workflow.ts:36, use-chat-stream.ts:133).
    tags: ['test-noise'],
    // Every entry below is a verified false positive or a pessimization, scoped
    // to the exact file that produced it so the rule stays live everywhere else.
    // Each path is listed in every form the tool can emit, because the scan
    // root decides it: a project-root scan reports `src/components/…`, one
    // rooted at `src` reports `components/…`, and one rooted at
    // `src/components` reports `site/…`. A missing form silently re-reports
    // an already-triaged finding, which is how 9 "new" warnings appeared
    // under `npx react-doctor src` while the root scan read 100/100.
    overrides: [
      {
        // Fast-Refresh-only concern. Each file co-locates a small constant or
        // pure helper with its component (mobileNavShortcuts, formErrorClass,
        // battleVisualsSettled). The cost is a dev-time full reload on edit; the
        // fix is 10+ import-site edits across src/components and src/routes for
        // zero runtime gain.
        files: [
          'src/components/site/battle/pixel-battle-background.tsx',
          'components/site/battle/pixel-battle-background.tsx',
          'site/battle/pixel-battle-background.tsx',
          'src/components/site/mobile-nav-drawer.tsx',
          'components/site/mobile-nav-drawer.tsx',
          'site/mobile-nav-drawer.tsx',
          'src/components/site/os-ui.tsx',
          'components/site/os-ui.tsx',
          'site/os-ui.tsx',
        ],
        rules: ['react-doctor/only-export-components'],
      },
      {
        // mermaid-diagram.tsx guards every post-await setter with the `active`
        // flag set in its effect cleanup. No out-of-order write is possible.
        // The old `async-await-in-loop` exemption for this renderer is gone with
        // the loop: each MermaidDiagram instance renders exactly one diagram.
        files: ['src/components/site/content/mermaid-diagram.tsx', 'components/site/content/mermaid-diagram.tsx'],
        rules: ['react-doctor/no-set-state-after-await-in-effect'],
      },
      {
        // chat-transcript keys an append-only list by position. The reducer only
        // ever appends at the tail (chat-session-state.ts:266/276/291) or
        // truncates the tail (:147-149, :319-320, :327), so items are never
        // reordered or filtered out of the middle. MessageScrollerItem's
        // messageId is already position-derived by design, so index keys give
        // identical DOM reuse. A "stable id" would mean threading an id through
        // the reducer *and* the server ChatMessage type that gets signed.
        files: [
          'src/components/site/chat/chat-transcript.tsx',
          'components/site/chat/chat-transcript.tsx',
          'site/chat/chat-transcript.tsx',
        ],
        rules: ['react-doctor/no-array-index-as-key'],
      },
      {
        // form-phase.tsx:69-73 is a client-only chat contact form: TanStack Form
        // validation, Turnstile, pending/disabled state, and server field-error
        // mapping. A <form action={serverAction}> cannot express any of that,
        // and this form is not part of a progressive-enhancement surface.
        // This rule carries no `test-noise` tag, so it needs its own entry.
        files: [
          'src/components/site/chat/contact/form-phase.tsx',
          'components/site/chat/contact/form-phase.tsx',
          'site/chat/contact/form-phase.tsx',
        ],
        rules: ['react-doctor/no-prevent-default'],
      },
      {
        // route-progress-bar.tsx is a `scaleX` overlay on a fixed 4px bar. A
        // real <progress> element would need `appearance: none` plus width and
        // height resets on `.os-route-progress` (styles/shell.css) to keep that
        // geometry, in exchange for a UA element whose semantics the div
        // already states in full: aria-label, aria-valuemin, aria-valuemax,
        // aria-valuenow, and aria-hidden while idle. tests/route-progress.test.tsx
        // pins that contract.
        files: [
          'src/components/site/route-progress-bar.tsx',
          'components/site/route-progress-bar.tsx',
          'site/route-progress-bar.tsx',
        ],
        rules: ['react-doctor/prefer-tag-over-role'],
      },
    ],
  },
}
