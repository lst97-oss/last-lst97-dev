import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { AdminNotFound } from '../lib/payload/admin-not-found'
import { adminRenderServerFn } from '../lib/payload/admin-render'
import { type AdminRenderResult, getAdminRenderIntent, parseAdminSearchParams } from '../lib/payload/admin-route'

export const Route = createFileRoute('/_payload/admin/')({
  // Without this boundary the root route's site `NotFoundPage` renders for
  // every unknown admin path. Same boundary type as the splat route so
  // index ↔ splat navigation preserves the admin subtree.
  notFoundComponent: AdminNotFound,
  loader: async ({ location }) => {
    const result = (await adminRenderServerFn({
      data: { search: parseAdminSearchParams(location.searchStr), segments: [] },
    })) as AdminRenderResult
    const intent = getAdminRenderIntent(result.intent)
    if (intent.type === 'redirect') {
      throw redirect({ to: intent.url })
    }
    if (intent.type === 'not-found') {
      // The payload is Payload's own not-found RSC tree, built server-side by
      // `renderNotFoundPage`. Forwarding it through the error's `data` is what
      // lets `AdminNotFound` render it — and the throw itself is what preserves
      // the 404 status.
      throw notFound({ data: { element: result.element } })
    }
    return result
  },
  component: AdminIndex,
})

function AdminIndex() {
  const data = Route.useLoaderData()
  return <>{data.element}</>
}
