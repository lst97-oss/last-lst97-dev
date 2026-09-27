import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { adminRenderServerFn } from '../lib/payload/admin-render'
import { type AdminRenderResult, getAdminRenderIntent, parseAdminSearchParams } from '../lib/payload/admin-route'

export const Route = createFileRoute('/_payload/admin/')({
  loader: async ({ location }) => {
    const result = (await adminRenderServerFn({
      data: { search: parseAdminSearchParams(location.searchStr), segments: [] },
    })) as AdminRenderResult
    const intent = getAdminRenderIntent(result.intent)
    if (intent.type === 'redirect') {
      throw redirect({ to: intent.url })
    }
    if (intent.type === 'not-found') {
      throw notFound()
    }
    return result
  },
  component: AdminIndex,
})

function AdminIndex() {
  const data = Route.useLoaderData()
  return <>{data.element}</>
}
