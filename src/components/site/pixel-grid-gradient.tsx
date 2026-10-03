import { cn } from 'cn'
import type { HTMLAttributes } from 'react'

export function PixelGridGradient({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('pixel-grid-gradient', className)}>
      {children}
    </div>
  )
}
