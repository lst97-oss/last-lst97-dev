import { createServerFn } from '@tanstack/react-start'
import configPromise from '@payload-config'
import { getLayoutData } from '@payloadcms/tanstack-start/layouts'
import { handleServerFunctions, toSerializable } from '@payloadcms/tanstack-start/server'

// Bun-native: Web APIs only. Payload server functions shared by all admin
// routes — config + importMap injection point. Client components call
// `payloadServerFn({ data: { name, args } })`; the adapter dispatcher
// (shared handlers + RSC-only handlers) runs on the server via TanStack
// Start's wire format — NOT Next 'use server' actions.
export const payloadServerFn = createServerFn({ method: 'POST', strict: false })
  .validator((input: { name: string; args: Record<string, unknown> }) => input)
  .handler(async ({ data }): Promise<unknown> => {
    const { getPayloadImportMap } = await import('./import-map')
    const result = await handleServerFunctions({
      args: data.args,
      config: configPromise,
      importMap: getPayloadImportMap(),
      name: data.name,
    })
    // `handleServerFunctions` already runs the adapter's `transformResult`
    // (`serializeForRsc`), which converts React elements into RSC handles.
    // Wrapping that in `toSerializable` a second time strips every element
    // back out (`$$typeof` is a Symbol), so handlers that return rendered
    // trees — `render-document` for the relationship "Create New" drawer,
    // `form-state`, `render-list` — arrive with their payload missing and the
    // UI hangs on its spinner. Return the already-serialized value as-is.
    return result
  })

// Root admin layout data — clientConfig, translations, theme, user,
// permissions. Called from the _payload layout loader.
export const payloadLayoutServerFn = createServerFn({ method: 'GET', strict: false }).handler(async (): Promise<unknown> => {
  const { getPayloadImportMap } = await import('./import-map')
  const data = await getLayoutData({ configPromise, importMap: getPayloadImportMap() })
  return toSerializable(data)
})
