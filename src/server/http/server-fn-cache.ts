import { createMiddleware } from '@tanstack/react-start'

// Identical to PUBLIC_CACHE in vite.config.ts: these responses feed the SSR
// pages, so they share the pages' edge lifetime.
const PUBLIC_SERVER_FN_CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'

export const publicServerFnCache = createMiddleware({ type: 'function' }).server(async ({ method, next }) => {
  const result = await next()
  if (method === 'GET') {
    // Dynamic import is load-bearing: `.server()` is stripped from the client
    // build, and a static `@tanstack/react-start/server` import would pull
    // node:async_hooks into the client graph (importProtection build error).
    // Header-after-next so a thrown handler never marks an error response
    // cacheable.
    const { setResponseHeader } = await import('@tanstack/react-start/server')
    setResponseHeader('cache-control', PUBLIC_SERVER_FN_CACHE_CONTROL)
  }
  return result
})

export const privateServerFnNoStore = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const result = await next()
  const { setResponseHeader } = await import('@tanstack/react-start/server')
  setResponseHeader('cache-control', 'private, no-store')
  return result
})
