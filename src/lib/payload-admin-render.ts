import { createServerFn } from '@tanstack/react-start'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { defaultAdminViews } from '@payloadcms/ui/views/Root/adminViews'
import { renderRoot } from '@payloadcms/ui/views/Root'
import { createPageRenderServerAdapter, serializeForRsc } from '@payloadcms/tanstack-start/server'

// Bun-native: Web APIs only. Renders an /admin subpath to HTML on the server
// via Payload's shared renderRoot (defaultAdminViews + initReq), then the
// client route injects it. Redirect/notFound surface as status intents the
// route loader converts to TanStack navigation.
export const adminRenderServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { segments: string[]; search: Record<string, string | string[]> }) => input)
  .handler(async ({ data }): Promise<unknown> => {
    const payload = await getPayload({ config: configPromise })
    const nav: { type?: 'notFound' | 'redirect'; url?: string } = {}
    const serverAdapter = createPageRenderServerAdapter(nav)
    const notFound = (): never => {
      nav.type = 'notFound'
      throw new Error('not-found')
    }
    const redirect = (url: string): never => {
      nav.type = 'redirect'
      nav.url = url
      throw new Error(`redirect:${url}`)
    }
    try {
      const element = await renderRoot({
        adminViews: defaultAdminViews,
        config: configPromise,
        importMap: payload.importMap,
        initReq: (async (args: never) => {
          const { initReq } = await import('@payloadcms/tanstack-start/server')
          return initReq({ ...(args as object), serverAdapter } as never)
        }) as never,
        key: data.segments.join('/'),
        notFound,
        params: Promise.resolve({ segments: data.segments }),
        redirect,
        searchParams: Promise.resolve(data.search),
      })
      // RSC-native: serialize the element via serializeForRsc → renderServerComponent
      // handle so TanStack Start's $RSC adapter streams Flight to the client.
      // Raw elements fail seroval (Symbol(react.transitional.element)).
      if (nav.type) {
        return { intent: nav, element: null }
      }
      const serialized = await serializeForRsc(element)
      return { intent: null, element: serialized }
    } catch (error) {
      if (nav.type) {
        return { intent: nav, element: null }
      }
      throw error
    }
  })
