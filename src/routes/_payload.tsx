import { TanStackRouterAdapter } from '@payloadcms/tanstack-start/client'
import { RootProvider } from '@payloadcms/ui'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import type React from 'react'
import payloadAdminCss from '@/styles/payload-admin.css?url'
import { type PayloadLayoutData, toRootProviderProps } from '../lib/payload/layout'
import { payloadLayoutServerFn, payloadServerFn } from '../lib/payload/server-fns'

export const Route = createFileRoute('/_payload')({
  loader: async () => {
    const data = await payloadLayoutServerFn()
    return data as never
  },
  component: PayloadLayout,
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'stylesheet', href: payloadAdminCss }],
  }),
})

function PayloadLayout() {
  const data = Route.useLoaderData() as unknown as PayloadLayoutData
  const Provider = RootProvider as unknown as (props: Record<string, unknown>) => React.JSX.Element
  return (
    <Provider
      {...toRootProviderProps(data)}
      RouterAdapter={TanStackRouterAdapter}
      serverFunction={({ name, args }: { name: string; args: Record<string, unknown> }) =>
        payloadServerFn({ data: { args, name } })
      }
      highContrastMode={false}
    >
      <Outlet />
    </Provider>
  )
}
