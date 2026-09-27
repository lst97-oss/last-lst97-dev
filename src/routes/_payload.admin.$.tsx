import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { adminRenderServerFn } from '../lib/payload/admin-render'
import {
  type AdminRenderResult,
  buildAdminRenderRequest,
  getAdminRenderIntent,
} from '../lib/payload/admin-route'

export const Route = createFileRoute('/_payload/admin/$')({
  loader: async ({ location, params }) => {
    const segments = (params._splat ?? '').split('/').filter(Boolean)
    const result = (await adminRenderServerFn({
      data: buildAdminRenderRequest(location.searchStr, segments),
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
  component: AdminSplat,
})

function AdminSplat() {
  const data = Route.useLoaderData()
  return <>{data.element}</>
}
