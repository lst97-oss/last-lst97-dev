import type { ReactNode } from 'react'

/**
 * The forwarded RSC element, or `undefined` when the loader attached none.
 *
 * Exported because this is the branch the admin not-found boundary's behaviour
 * turns on, and `NotFoundClient` needs Payload's provider contexts to render,
 * so the selection is unit-testable while the fallback is not.
 *
 * It lives beside `admin-not-found.tsx` rather than inside it so the component
 * file exports only a component: co-locating a pure helper with a component
 * costs a dev-time full reload on every edit to either.
 */
export function adminNotFoundElement(data: unknown): ReactNode | undefined {
  if (typeof data !== 'object' || data === null || !('element' in data)) return undefined

  const { element } = data
  if (element === null || element === undefined) return undefined

  // `in` narrows the property to `{}`, not `ReactNode`. The value is the RSC
  // element tree this app's own loader placed on the error object, so the
  // assertion is to its render type rather than to an invented shape.
  const node = element as ReactNode
  return node
}
