import configPromise from '@payload-config'
import { loadLayoutData } from '@payloadcms/tanstack-start/layouts'
import { handleServerFunctions, loadAdminPage } from '@payloadcms/tanstack-start/server'
import { createServerFn } from '@tanstack/react-start'

import { privateServerFnNoStore } from '../../server/http/server-fn-cache'

// Bun-native: Web APIs only. Payload server functions shared by all admin
// routes — config + importMap injection point. Client components call the
// dispatcher through `createServerFunctionClient`, whose Flight response this
// server function returns as-is.
// The generated import map is imported lazily inside each handler: it pulls
// server-only Payload UI modules, and this module is also reachable from the
// client admin route graph. A static import would drag those modules in.
export const payloadServerFn = createServerFn({ method: 'POST', strict: false })
  .validator((input: { name: string; args: Record<string, unknown> }) => input)
  .handler(async ({ data }): Promise<Response> => {
    const { getPayloadImportMap } = await import('./import-map')
    return handleServerFunctions({
      args: data.args,
      config: configPromise,
      importMap: getPayloadImportMap(),
      name: data.name,
    })
  })

// Root admin layout data, called from the _payload layout route. Payload 4
// sends the complete layout model through Flight, so no extra serialization
// step is needed here.
export const payloadLayoutServerFn = createServerFn({ method: 'GET', strict: false })
  .middleware([privateServerFnNoStore])
  .handler(async () => {
    const { getPayloadImportMap } = await import('./import-map')
    return loadLayoutData({ config: await configPromise, importMap: getPayloadImportMap() })
  })

// One admin page per loader call. The adapter's route factories turn the
// `_redirect` / `_notFound` sentinels into TanStack navigation.
export const payloadAdminPageServerFn = createServerFn({ method: 'GET', strict: false })
  .middleware([privateServerFnNoStore])
  .validator((input: { splat: string; search: Record<string, string | string[]> }) => input)
  .handler(async ({ data }) => {
    const { getPayloadImportMap } = await import('./import-map')
    return loadAdminPage({
      config: await configPromise,
      importMap: getPayloadImportMap(),
      search: data.search,
      splat: data.splat,
    })
  })
