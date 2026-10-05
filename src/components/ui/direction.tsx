import type { TextDirection } from '@base-ui/react/direction-provider'
import { DirectionProvider as BaseDirectionProvider, useDirection } from '@base-ui/react/direction-provider'
import * as React from 'react'

/**
 * Radix's Direction took `dir`; Base UI's provider takes `direction`, and
 * `useDirection` comes from the package itself rather than being hand-rolled,
 * so it reads the provider's context instead of a fresh default.
 */
function DirectionProvider({ direction, children }: React.ComponentProps<typeof BaseDirectionProvider>) {
  return <BaseDirectionProvider direction={direction}>{children}</BaseDirectionProvider>
}

export type { TextDirection }
export { DirectionProvider, useDirection }
