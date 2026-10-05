import { cn } from 'cn'

/**
 * A keycap. The classes deliberately diverge from the shadcn registry source,
 * which ships `rounded-sm bg-muted px-1 font-sans`: this project defines no
 * `--radius` at all, so `rounded-sm` would resolve to Tailwind's stock 4px, and
 * every authored surface in `src/styles/*` is squared, 2-3px ink-bordered and
 * monospace. The metrics come from `.chat-context-frame-index`
 * (`src/styles/chat-tools.css`), the closest existing micro-badge.
 *
 * The `data-slot="tooltip-content"` variant is currently unreachable —
 * `tooltip.tsx` has no call site outside the unmounted `sidebar.tsx` — but it is
 * kept so the tooltip composition documented upstream keeps working if a
 * tooltip ever ships.
 */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-none border-2 border-border bg-muted px-1 font-mono text-[10px] font-black tracking-[0.08em] text-muted-foreground uppercase select-none',
        "[&_svg:not([class*='size-'])]:size-3",
        '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10',
        className,
      )}
      {...props}
    />
  )
}

/**
 * A chord. Upstream renders this as a `<kbd>` typed with `div` props, which
 * nests one `<kbd>` inside another — invalid markup for a key combination — so
 * it is a `<span>` here and the prop type follows.
 */
function KbdGroup({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="kbd-group" className={cn('inline-flex items-center gap-1', className)} {...props} />
}

export { Kbd, KbdGroup }
