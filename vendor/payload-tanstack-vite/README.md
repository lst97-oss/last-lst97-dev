# Vendored Payload TanStack Vite workarounds

Copied verbatim from `@payloadcms/tanstack-start@4.0.0-internal.183b315`
(`dist/vite/plugins/*` + `dist/vite/constants.js`) on 2026-09-21.

Why vendored: the adapter's `exports` map only exposes `./vite` →
`payloadPlugin`, which forces RSC mode (`@vitejs/plugin-rsc` +
`reactStartRscVitePlugin`). On the installed TanStack Start 1.168 line that
RSC path 404s every route (verified: baseline 200 → 404 with wrapper, 200
again with only these four plugins). These four are the RSC-independent
subset: `clientModuleResolution`, `wrapCjsForClient`,
`ssrStripDistStyleImports`, `payloadDevTransforms` + shared constants.

Refresh: re-copy from the installed adapter version after any
`@payloadcms/tanstack-start` bump; delete this directory once the full
`payloadPlugin` wrapper routes correctly (then import `./vite` again).
