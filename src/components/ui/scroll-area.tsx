import { cn } from "cn"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import * as React from "react"

function ScrollArea({
  className,
  children,
  viewportProps,
  scrollbars = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Props for the viewport, the element that actually scrolls and takes pan/keyboard handlers. */
  viewportProps?: React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>
  /**
   * Which axes get a themed bar. Radix only scrolls an axis its bar is
   * mounted for, so panes with unbreakable lines (e.g. code) need "both".
   * Defaults to "vertical" so existing usages are unchanged.
   */
  scrollbars?: "vertical" | "both"
}) {
  const { className: viewportClassName, ...restViewportProps } = viewportProps ?? {}
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative flex flex-col", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        // Stretch, not size-full: a percentage height cannot resolve against a
        // flex-stretched parent, and would let the viewport grow unbounded.
        className={cn(
          "min-h-0 min-w-0 flex-1 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName
        )}
        {...restViewportProps}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      {scrollbars === "both" ? <ScrollBar orientation="horizontal" /> : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
