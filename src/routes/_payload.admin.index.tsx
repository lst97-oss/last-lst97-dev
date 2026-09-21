import { createFileRoute, redirect } from '@tanstack/react-router'
import { adminRenderServerFn } from '../lib/payload-admin-render'

export const Route = createFileRoute('/_payload/admin/')({
  loader: async ({ location }) => {
    const search: Record<string, string | string[]> = {}
    for (const [key, value] of new URLSearchParams(location.searchStr).entries()) {
      search[key] = value
    }
    const result = (await adminRenderServerFn({ data: { search, segments: [] } })) as {
      intent: { type?: 'notFound' | 'redirect'; url?: string } | null
      element: React.ReactNode
    }
    if (result.intent?.type === 'redirect' && result.intent.url) {
      throw redirect({ to: result.intent.url })
    }
    if (result.intent?.type === 'notFound') {
      throw new Error('Admin page not found')
    }
    return result
  },
  component: AdminIndex,
})

function AdminIndex() {
  const data = Route.useLoaderData()
  return <>{data.element}</>
}
