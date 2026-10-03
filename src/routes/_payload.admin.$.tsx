import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { AdminNotFound } from '../lib/payload/admin-not-found'
import { adminRenderServerFn } from '../lib/payload/admin-render'
import { type AdminRenderResult, buildAdminRenderRequest, getAdminRenderIntent } from '../lib/payload/admin-route'

export const Route = createFileRoute('/_payload/admin/$')({
  // Without this boundary the root route's site `NotFoundPage` renders for
  // every unknown admin path. Same boundary type as the index route so
  // index ↔ splat navigation preserves the admin subtree.
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
      // Payload's own not-found RSC tree, built server-side by
      // `renderNotFoundPage`. Forwarding it through the error's `data` is what
      // lets `AdminNotFound` render it; the throw preserves the 404 status.
      throw notFound({ data: { element: result.element } })
    }
    return result
  },
  notFoundComponent: AdminNotFound,
  component: AdminSplat,
})

function AdminSplat() {
  const data = Route.useLoaderData()
  return <>{data.element}</>
}
