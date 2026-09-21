// @ts-nocheck — vendored Payload TanStack workaround plugins (see vendor/payload-tanstack-vite/README.md).
// The adapter's `exports` map only exposes `./vite` → `payloadPlugin`, which forces RSC
// mode (`@vitejs/plugin-rsc` + `reactStartRscVitePlugin`) that 404s every route on the
// installed TanStack Start 1.168 line. These four are the RSC-independent subset.
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import path from 'node:path'
import { defineConfig } from 'vite'
// NOTE(payload-bun): node:path kept — Vite config-file resolution requires Node
// specifier semantics. All app/routes/lib code uses Bun.env + Web APIs.
import { clientModuleResolution } from './vendor/payload-tanstack-vite/clientModuleResolution.js'
import { wrapCjsForClient } from './vendor/payload-tanstack-vite/wrapCjsForClient.js'
import { ssrStripDistStyleImports } from './vendor/payload-tanstack-vite/stripDistStyleImports.js'
import { payloadDevTransforms } from './vendor/payload-tanstack-vite/devTransforms.js'
import { reactDomServerInRsc } from './vendor/payload-tanstack-vite/reactDomServerInRsc.js'
import viteRsc from '@vitejs/plugin-rsc'
import { reactStartRscVitePlugin } from '@tanstack/react-start-rsc/plugin/vite'
import {
  defaultImportProtectionIgnoreImporters,
  onImportProtectionViolation,
  serverOnlyClientSpecifiers,
} from './vendor/payload-tanstack-vite/importProtection.js'
import {
  optimizeDepsExcludeDefaults,
  optimizeDepsIncludeDefaults,
  payloadNoExternalPatterns,
  ssrExternalPackages,
} from './vendor/payload-tanstack-vite/constants.js'

const config = defineConfig({
  resolve: {
    alias: [
      {
        find: '@payload-config',
        replacement: path.resolve('./payload.config.ts'),
      },
      // @payloadcms/ui@4.0.0-canary.35 ships dist/css/app.css but the adapter's
      // RootLayout imports the unpublished `@payloadcms/ui/scss/app.scss`
      // source path. Alias to the built CSS until the published package
      // restores the scss export (dev works because the strip plugin empties
      // server-env style imports; prod client build needs a real file).
      {
        find: '@payloadcms/ui/scss/app.scss',
        replacement: path.resolve('./node_modules/@payloadcms/ui/dist/css/app.css'),
      },
    ],
    dedupe: ['react', 'react-dom', 'scheduler', '@payloadcms/ui'],
    tsconfigPaths: true,
  },
  define: {
    global: 'globalThis',
  },
  environments: {
    ssr: {
      resolve: {
        noExternal: payloadNoExternalPatterns,
      },
    },
  },
  optimizeDeps: {
    exclude: optimizeDepsExcludeDefaults,
    include: [...optimizeDepsIncludeDefaults],
  },
  ssr: {
    external: [...ssrExternalPackages],
    noExternal: payloadNoExternalPatterns,
  },
  plugins: [
    devtools(),
    tailwindcss(),
    clientModuleResolution(),
    wrapCjsForClient(),
    ssrStripDistStyleImports(),
    reactDomServerInRsc(),
    payloadDevTransforms(),
    // Order (matches payloadPlugin wrapper): raw viteRsc() first for
    // virtual:vite-rsc/*, then reactStartRscVitePlugin() for
    // virtual:tanstack-rsc-*, then tanstackStart with rsc enabled.
    // serverHandler:false — Start owns the dev server entry; the raw RSC
    // handler export check 500s ("Invalid server handler entry") otherwise.
    viteRsc({ serverHandler: false }),
    reactStartRscVitePlugin(),
    tanstackStart({
      rsc: { enabled: true },
      importProtection: {
        client: {
          excludeFiles: [],
          specifiers: serverOnlyClientSpecifiers,
        },
        ignoreImporters: [...defaultImportProtectionIgnoreImporters],
        include: ['**/*'],
        mockAccess: 'warn',
        onViolation: onImportProtectionViolation,
        server: { files: [] },
      },
    }),
    viteReact(),
  ],
})

export default config
