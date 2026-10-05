'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { cn } from 'cn'
import { ChevronDownIcon } from 'lucide-react'

/**
 * Radix took `type="single" | "multiple"` plus `collapsible`; Base UI drops
 * both. Single-open is the default when `multiple` is absent, a single panel is
 * always collapsible, and `value`/`defaultValue` are ALWAYS arrays. The root
 * renders no element, so there is nothing for a wrapper to add.
 */
function Accordion({ ...props }: AccordionPrimitive.Root.Props) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b last:border-b-0', className)}
      {...props}
    />
  )
}

/**
 * The trigger's open marker is `data-panel-open` (Base UI reserves `data-open`
 * for the panel itself), and a disabled trigger surfaces as `aria-disabled`
 * rather than the `disabled` attribute.
 */
function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&[data-panel-open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/**
 * The height animation lives on the INNER div, not the panel: the panel is what
 * Base UI measures, so animating the panel's own height fights the measurement
 * it drives. `--accordion-panel-height` is the unprefixed custom property.
 */
function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel data-slot="accordion-content" className="overflow-hidden text-sm" {...props}>
      <div
        className={cn(
          'h-(--accordion-panel-height) overflow-hidden transition-[height] data-starting-style:h-0 data-ending-style:h-0',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
