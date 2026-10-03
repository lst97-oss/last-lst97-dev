import { NotFoundClient } from '@payloadcms/ui'

import { adminNotFoundElement } from './admin-not-found-element'

/**
 * Payload's own admin not-found view.
 *
 * `loadAdminPage` (`@payloadcms/tanstack-start/dist/utilities/loadAdminPage.js:131-152`)
 * already builds Payload's not-found RSC payload by calling `renderNotFoundPage`
 * on the server, and `src/lib/payload/admin-render.ts` forwards it as
 * `result.element`. The route loaders used to throw `notFound()` without that
 * payload, so TanStack walked up to the root's site `NotFoundPage`.
 *
 * The bare `NotFoundClient` is the fallback when the payload is absent — the
 * same shape as upstream's `AdminNotFound`
 * (`@payloadcms/tanstack-start/dist/routes/adminRoutes.js:49-58`). Both admin
 * routes share one boundary component so index ↔ splat navigation preserves
 * the admin subtree.
 *
 * The throw must stay a throw: returning the payload would answer HTTP 200,
 * and the route component never renders once a match is marked not-found.
 */
export function AdminNotFound({ data }: { data?: unknown }) {
  const element = adminNotFoundElement(data)
  // Compare against `undefined`, not truthiness: `0` and `''` are legal React
  // children, and a truthiness check would discard them for the fallback.
  if (element === undefined) return <NotFoundClient />

  return <>{element}</>
}
