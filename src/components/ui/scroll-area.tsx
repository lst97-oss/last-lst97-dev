import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { cn } from 'cn'
import * as React from 'react'

function ScrollArea({
  className,
  children,
  viewportProps,
  scrollbars = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Props for the viewport, the element that actually scrolls and takes pan/keyboard handlers. */
  viewportProps?: React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>
  /**
   * Which axes get a themed bar. Base UI lets the viewport scroll on both axes
   * regardless of which bars are mounted, so this now only decides whether a
   * bar is painted — it is kept so the existing call sites keep describing the
   * bars they are meant to show. Defaults to "vertical" so existing usages are
   * unchanged.
   */
  scrollbars?: 'vertical' | 'both' | 'horizontal'
}) {
  const { className: viewportClassName, ...restViewportProps } = viewportProps ?? {}
  const { ref, ...restProps } = props
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      // The Root composes its own ref, so a caller's ref is forwarded here and
      // both stay live. That lets callers reach the scroll viewport and its
      // offsets without wrapping the component in another element.
      ref={ref}
      className={cn('relative flex flex-col', className)}
      {...restProps}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        // Stretch, not size-full: a percentage height cannot resolve against a
        // flex-stretched parent, and would let the viewport grow unbounded.
        className={cn(
          'min-h-0 min-w-0 flex-1 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
          viewportClassName,
        )}
        {...restViewportProps}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {/* Base UI always permits scrolling on both axes, so these bars are purely
          themed: the vertical bar is skipped entirely for a strip that only ever
          scrolls sideways. They stay mounted so the persistent CSS keyed on
          [data-orientation] keeps matching while the bar is idle. */}
      {scrollbars === 'both' || scrollbars === 'vertical' ? <ScrollBar /> : null}
      {scrollbars === 'both' || scrollbars === 'horizontal' ? <ScrollBar orientation="horizontal" /> : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      keepMounted
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
