export default {
  ignore: {
    // Doctor matches these paths against whichever scan root is supplied.
    // Support both the usual project root and a focused `src` scan.
    files: [
      'src/server/**',
      'src/components/ui/**',
      'server/**',
      'components/ui/**',
    ],
    // Every entry below is a verified false positive or a pessimization, scoped
    // to the exact file that produced it so the rule stays live everywhere else.
    overrides: [
      {
        // Fast-Refresh-only concern. Each file co-locates a small constant or
        // pure helper with its component (mobileNavShortcuts, formErrorClass,
        // battleVisualsSettled). The cost is a dev-time full reload on edit; the
        // fix is 10+ import-site edits across src/components and src/routes for
        // zero runtime gain.
        files: [
          'src/components/site/battle/pixel-battle-background.tsx',
          'src/components/site/mobile-nav-drawer.tsx',
          'src/components/site/os-ui.tsx',
        ],
        rules: ['react-doctor/only-export-components'],
      },
      {
        // chat-pipeline-diagram:142 already guards every post-await setter with
        // the `active` flag set in the effect cleanup (lines 143/180/187/192).
        // No out-of-order write is possible.
        files: ['src/components/site/chat/chat-pipeline-diagram.tsx'],
        rules: ['react-doctor/no-set-state-after-await-in-effect'],
      },
      {
        // chat-pipeline-diagram:178 awaits mermaid.render per diagram, but
        // mermaid serialises render through one module-level executionQueue
        // (mermaid.core.mjs:1559-1616). Promise.all would enqueue all N calls
        // and still run them one at a time, so the suggested fix is a no-op.
        files: ['src/components/site/chat/chat-pipeline-diagram.tsx'],
        rules: ['react-doctor/async-await-in-loop'],
      },
      {
        // chat-transcript keys an append-only list by position. The reducer only
        // ever appends at the tail (chat-session-state.ts:266/276/291) or
        // truncates the tail (:147-149, :319-320, :327), so items are never
        // reordered or filtered out of the middle. MessageScrollerItem's
        // messageId is already position-derived by design, so index keys give
        // identical DOM reuse. A "stable id" would mean threading an id through
        // the reducer *and* the server ChatMessage type that gets signed.
        files: ['src/components/site/chat/chat-transcript.tsx'],
        rules: ['react-doctor/no-array-index-as-key'],
      },
      {
        // form-phase.tsx:44 is a client-only chat contact form: TanStack Form
        // validation, Turnstile, pending/disabled state, and server field-error
        // mapping. A <form action={serverAction}> cannot express any of that,
        // and this form is not part of a progressive-enhancement surface.
        files: ['src/components/site/chat/contact/form-phase.tsx'],
        rules: ['react-doctor/no-prevent-default'],
      },
      {
        // serverErrors.*.includes(field.key) runs inside a .map over at most
        // 9 fields (the largest template, feature_request), once per render.
        // Worst case is 81 string comparisons on an input keystroke.
        files: ['src/components/site/chat/contact/form-phase.tsx'],
        rules: ['react-doctor/js-set-map-lookups'],
      },
      {
        // Both chat fetches read the body with .json().catch(() => null) and
        // then branch on the status before trusting the payload:
        // use-chat-contact-workflow.ts:28 (!response.ok || !data?.event) and
        // use-chat-stream.ts:133 (!response.ok || !data?.reply).
        files: ['src/components/site/chat/use-chat-contact-workflow.ts', 'src/components/site/chat/use-chat-stream.ts'],
        rules: ['react-doctor/no-fetch-response-used-without-status-check'],
      },
      {
        // shell.tsx MelbourneTemperature is a cosmetic third-party weather
        // readout. The effect already has the AbortController, 8s timeout,
        // 30-minute interval, `disposed` flag, and activeRequest identity
        // check that this rule asks for; a react-query version still fetches
        // on mount in an effect, so the rule would not be satisfied anyway.
        files: ['src/components/site/shell.tsx'],
        rules: ['react-doctor/no-fetch-in-effect'],
      },
    ],
  },
}
