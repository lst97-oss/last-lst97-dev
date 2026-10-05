'use client'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

/** Radix's `Collapsible.Content` is `Collapsible.Panel` in Base UI. */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
}

/**
 * Open state is `data-open`/`data-closed` (not Radix's `data-state`), and the
 * measured height custom property is the unprefixed
 * `--collapsible-panel-height`.
 */
function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
