'use client'

import { cn } from 'cn'
import * as React from 'react'

/**
 * Base UI ships no Label primitive, and a label is already a plain element: the
 * only thing Radix's Root contributed was a `<label>` with a `data-disabled`
 * hook for form-field context. The native element carries that via
 * `aria-disabled` on the wrapper, so the class string is unchanged.
 */
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
