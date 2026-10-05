import { payloadParseSearch, payloadStringifySearch } from '@payloadcms/tanstack-start/shared'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { NotFoundPage } from '@/components/site/not-found-page'
import { getContext } from './integrations/tanstack-query/root-provider'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const context = getContext()
  const router = createTanStackRouter({
    routeTree,
    context,
    parseSearch: payloadParseSearch,
    stringifySearch: payloadStringifySearch,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Content loaders await a real `createServerFn` round trip, so a client
    // navigation has no visible progress between the click and the response.
    // 100ms keeps fast navigations clean; 150ms is the floor below which a
    // skeleton is worse than the outgoing page.
    defaultPendingMs: 100,
    defaultPendingMinMs: 150,
    defaultNotFoundComponent: () => <NotFoundPage />,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
