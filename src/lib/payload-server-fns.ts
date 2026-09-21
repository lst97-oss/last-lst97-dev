import { createServerFn } from '@tanstack/react-start'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
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
    const payload = await getPayload({ config: configPromise })
    const result = await handleServerFunctions({
      args: data.args,
      config: configPromise,
      importMap: payload.importMap,
      name: data.name,
    })
    return toSerializable(result)
  })

// Root admin layout data — clientConfig, translations, theme, user,
// permissions. Called from the _payload layout loader.
export const payloadLayoutServerFn = createServerFn({ method: 'GET', strict: false }).handler(async (): Promise<unknown> => {
  const payload = await getPayload({ config: configPromise })
  const data = await getLayoutData({ configPromise, importMap: payload.importMap })
  return toSerializable(data)
})
