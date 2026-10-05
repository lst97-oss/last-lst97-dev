// @ts-nocheck — vendored Payload TanStack workaround plugins (see vendor/payload-tanstack-vite/README.md).
// The adapter's `exports` map only exposes `./vite` → `payloadPlugin`, which forces RSC
// mode (`@vitejs/plugin-rsc` + `reactStartRscVitePlugin`) that 404s every route on the
// installed TanStack Start 1.168 line. These four are the RSC-independent subset.

import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { reactStartRscVitePlugin } from '@tanstack/react-start-rsc/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteRsc from '@vitejs/plugin-rsc'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { clientModuleResolution } from './vendor/payload-tanstack-vite/clientModuleResolution.js'
import {
  optimizeDepsExcludeDefaults,
  optimizeDepsIncludeDefaults,
  payloadNoExternalPatterns,
  ssrExternalPackages,
} from './vendor/payload-tanstack-vite/constants.js'
import { payloadDevTransforms } from './vendor/payload-tanstack-vite/devTransforms.js'
import {
  defaultImportProtectionIgnoreImporters,
  onImportProtectionViolation,
  serverOnlyClientSpecifiers,
} from './vendor/payload-tanstack-vite/importProtection.js'
import { reactDomServerInRsc } from './vendor/payload-tanstack-vite/reactDomServerInRsc.js'
import { ssrStripDistStyleImports } from './vendor/payload-tanstack-vite/stripDistStyleImports.js'
import { wrapCjsForClient } from './vendor/payload-tanstack-vite/wrapCjsForClient.js'

const projectPath = (relativePath: string) => {
  const resolvedPath = relativePath.replace(/^\.\//, '')
  return typeof Bun !== 'undefined'
    ? Bun.resolveSync(`./${resolvedPath}`, process.cwd())
    : `${process.cwd()}/${resolvedPath}`
}

// Public pages render identical HTML for every visitor, so the shared CDN may
// hold them. `max-age=0` is deliberate: the browser still revalidates on every
// navigation, so a deploy or a Payload edit is visible to the editor
// immediately, while everyone else is served from the edge. The 1h `s-maxage`
// is the background-refresh window; `stale-while-revalidate` keeps serving the
// previous copy while that refresh runs, so a slow origin never shows a stall.
const PUBLIC_CACHE = {
  'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
}

// Never shared-cache. The admin is authenticated and cookie-bearing, so a
// stored response is how one operator's session could reach another.
const PRIVATE_NO_STORE = { 'cache-control': 'private, no-store' }

const config = defineConfig({
  resolve: {
    alias: [
      {
        find: '@payload-config',
        replacement: projectPath('./payload.config.ts'),
      },
      // @payloadcms/ui@4.0.0-canary.35 ships dist/css/app.css but the adapter's
      // RootLayout imports the unpublished `@payloadcms/ui/scss/app.scss`
      // source path. Alias to the built CSS until the published package
      // restores the scss export (dev works because the strip plugin empties
      // server-env style imports; prod client build needs a real file).
      {
        find: '@payloadcms/ui/scss/app.scss',
        replacement: projectPath('./node_modules/@payloadcms/ui/dist/css/app.css'),
      },
      {
        // Payload UI's compiled client files import the named `c` compiler-runtime export.
        // Vite's raw CJS fallback exposes only a default export for React's entrypoint.
        find: 'react/compiler-runtime',
        replacement: projectPath('./vendor/react-compiler-runtime.ts'),
      },
      {
        // Payload's browser shared graph reaches sanitize-filename through an excluded
        // CommonJS package, so Vite cannot apply the package's browser dependency path.
        find: 'sanitize-filename',
        replacement: projectPath('./vendor/sanitize-filename.ts'),
      },
    ],
    dedupe: ['react', 'react-dom', 'scheduler', '@payloadcms/ui'],
    tsconfigPaths: true,
  },
  define: {
    global: 'globalThis',
    // Canonical origin for every SEO surface (meta, canonical links, og:url,
    // sitemap.xml, robots.txt, security.txt). Route head() runs in the client
    // bundle too, so this cannot read process.env at runtime; it is inlined
    // at build time from PUBLIC_SITE_URL and falls back to the dev origin.
    // Changing it on Vercel therefore requires a redeploy to take effect.
    __LAST_OS_SITE_URL__: JSON.stringify(process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  },
  environments: {
    ssr: {
      resolve: {
        noExternal: payloadNoExternalPatterns,
      },
    },
  },
  build: {
    // Vite's default 500 kB threshold is exceeded by two client chunks that are
    // both deferred and out of the initial path: `elk` (1.4 MB, reached only via
    // mermaid, which chat-pipeline-diagram.tsx loads with a dynamic import) and
    // a Payload admin chunk. Neither blocks first paint, so warning on them
    // every build trains the reader to ignore the warning — including the day
    // a real regression moves that much weight onto the critical path.
    //
    // 2000 kB keeps the signal for a genuinely new oversized entry chunk while
    // silencing the known-deferred ones. Revisit if `elk` is ever dropped from
    // the client graph rather than dynamically imported.
    chunkSizeWarningLimit: 2000,
  },
  optimizeDeps: {
    exclude: [...optimizeDepsExcludeDefaults, '@openrouter/sdk'],
    include: [...optimizeDepsIncludeDefaults],
  },
  ssr: {
    external: [...ssrExternalPackages, '@openrouter/sdk'],
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
    // Vercel is the production target. NITRO_PRESET overrides it for other
    // runtimes (the Dockerfile builds with NITRO_PRESET=node-server for a
    // standalone container server). Explicit config wins over the env var
    // inside Nitro, so the override has to happen here.
    nitro({
      preset: process.env.NITRO_PRESET ?? 'vercel',
      // Public pages were re-rendered on every request (Vercel's default is
      // `public, max-age=0, must-revalidate`, so every hit was a
      // `x-vercel-cache: MISS`), which charged each visitor a full origin
      // render for identical content.
      routeRules: {
        // Never shared-cache authenticated or per-request state: the admin and
        // the REST API both emit the platform default `public` header, which on
        // a shared cache is how one operator's session could reach another.
        '/api/site/og': {
          headers: { 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
        },
        // Payload's admin is mounted at `/admin`, NOT `/_payload/**` — the
        // `/_payload` segment only exists as the TanStack file-route id
        // (`src/routes/_payload.tsx` registers `/_payload`, whose `admin`
        // child resolves to the real `/admin` path at runtime). Verified live:
        // `/admin` returned `x-vercel-cache: HIT` while a rule only ever
        // guarded `/_payload/**`, so the admin shell was being served from the
        // edge and an operator saw a stale gallery until a cache-bypassing
        // reload. Both prefixes are guarded: `/_payload/**` because the route
        // tree declares it, and `/admin/**` because that is what actually
        // serves the panel.
        '/admin/**': { headers: PRIVATE_NO_STORE },
        '/_payload/**': { headers: PRIVATE_NO_STORE },
        '/api/**': { headers: PRIVATE_NO_STORE },
        // Public, cacheable surfaces, enumerated rather than a blanket `/**`.
        // A catch-all silently cacheable-covers every future route, which is
        // exactly how `/admin` ended up edge-cached: a route added after the
        // rule was written is not covered by an exclusion nobody thought to
        // add. Naming the public pages makes that failure mode impossible —
        // an unlisted route falls through to Vercel's uncached default.

        // The `.well-known` and `.txt` routes set their own `max-age=3600`
        // and are left to that.
        '/': { headers: PUBLIC_CACHE },
        '/about': { headers: PUBLIC_CACHE },
        '/services': { headers: PUBLIC_CACHE },
        '/chat': { headers: PUBLIC_CACHE },
        '/contact': { headers: PUBLIC_CACHE },
        '/projects': { headers: PUBLIC_CACHE },
        '/projects/**': { headers: PUBLIC_CACHE },
        '/blog': { headers: PUBLIC_CACHE },
        '/blog/**': { headers: PUBLIC_CACHE },
        '/changelog': { headers: PUBLIC_CACHE },
        '/changelog/**': { headers: PUBLIC_CACHE },
      },
    }),
  ],
})

export default config
