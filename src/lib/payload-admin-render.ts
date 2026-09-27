import { createServerFn } from '@tanstack/react-start'
import configPromise from '@payload-config'
import { buildAdminRenderParams } from './payload-admin-route'

// Bun-native: Web APIs only. Renders an /admin subpath to HTML on the server
// via Payload's shared renderRoot (defaultAdminViews + initReq), then the
// client route injects it. Redirect/notFound surface as status intents the
// route loader converts to TanStack navigation.
export const adminRenderServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { segments: string[]; search: Record<string, string | string[]> }) => input)
  .handler(async ({ data }): Promise<unknown> => {
    // Keep the generated server-component map out of the browser graph. The
    // RSC client build must not evaluate Payload's server-only imports.
    const [{ loadAdminPage }, { getPayloadImportMap }] = await Promise.all([
      import('@payloadcms/tanstack-start/server'),
      import('./payload-import-map'),
    ])
    const result = await loadAdminPage({
      config: await configPromise,
      importMap: getPayloadImportMap(),
      search: data.search,
      splat: buildAdminRenderParams(data.segments).segments?.join('/'),
    })

    if ('_redirect' in result) {
      return { intent: { type: 'redirect', url: result._redirect }, element: null }
    }

    if ('_notFound' in result) {
      return { intent: { type: 'notFound' }, element: result.rscPayload ?? null }
    }

    return {
      element: result.rscPayload,
      intent: null,
      metadata: result.metadata,
      routeKey: result.routeKey,
    }
  })
