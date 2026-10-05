import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { cn } from 'cn'

/**
 * Base UI's Separator is decorative by construction — it renders a `<div role="separator">`
 * with no focusability — so Radix's `decorative` prop is dropped rather than
 * forwarded. `orientation` is unchanged and `data-orientation` survives.
 */
function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
