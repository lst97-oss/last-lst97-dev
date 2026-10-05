'use client'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from 'cn'

/**
 * Base UI's Indicator sets its own inline `width` from the root's value
 * (`progress/indicator/ProgressIndicator.js:30-33`), so the manual
 * `translateX(-N%)` Radix needed is dropped. A `transition-[width]` is what
 * keeps the bar easing, since there is no longer a transform to transition.
 */
function Progress({ className, value, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full w-full bg-primary transition-[width]"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
