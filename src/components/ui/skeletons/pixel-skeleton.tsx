import { cn } from 'cn'
import type { ReactNode } from 'react'
import { PlaceholderArt } from '@/components/site/content/cover-placeholder'
import { PixelIcon } from '@/components/site/pixel-icon'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Pixel-art loading primitives. The whole set composes the headless
 * `Skeleton` and adds one house rule on top: `rounded-none`. The site's OS
 * chrome is hard-edged (3px borders, square corners, offset shadows), so the
 * rounded `bg-accent` default of the headless primitive reads as a different
 * design language than the page it is standing in for.
 *
 * Chrome is re-declared rather than reused from `@/components/site/**`: the
 * real `WindowFrame`, `CardGrid`, and `PageStack` write to `os-store`, measure
 * with `ResizeObserver`, and mount a scroll area. None of that is
 * useful while a route is pending, and all of it makes the markup
 * non-deterministic. The class strings below are copied verbatim from those
 * components, so the swap from skeleton to content causes no layout jump.
 */

/** Tailwind's scanner only sees literal class strings, so the widths are
 *  spelled out here instead of interpolated. */
const BAR_WIDTHS = {
  40: 'max-w-40',
  55: 'max-w-55',
  70: 'max-w-70',
  85: 'max-w-85',
  100: 'max-w-full',
} as const

export type PixelSkeletonBarWidth = keyof typeof BAR_WIDTHS

/**
 * The one definition of the pixel look. Every other primitive in this
 * directory composes it rather than restating `rounded-none`.
 */
export function PixelSkeletonBlock({ className, ...props }: React.ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn('rounded-none', className)} {...props} />
}

/** A single-line text stub. */
export function PixelSkeletonBar({ width = 100, className }: { width?: PixelSkeletonBarWidth; className?: string }) {
  return <PixelSkeletonBlock className={cn('h-3 w-full', BAR_WIDTHS[width], className)} />
}

/** A stack of line stubs standing in for a paragraph. */
export function PixelSkeletonLines({
  count = 3,
  lastWidth = 55,
  className,
}: {
  count?: number
  lastWidth?: PixelSkeletonBarWidth
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }, (_, index) => (
        <PixelSkeletonBar key={index} width={index === count - 1 ? lastWidth : 100} />
      ))}
    </div>
  )
}

/** Mirrors `Tag` in `@/components/site/os-ui`. */
export function PixelSkeletonChip({ className }: { className?: string }) {
  return <PixelSkeletonBlock className={cn('h-4 w-16 border-2 border-border bg-primary', className)} />
}

/** Mirrors `CountBadge` in `@/components/site/os-ui`. */
export function PixelSkeletonBadge({ className }: { className?: string }) {
  return <PixelSkeletonBlock className={cn('h-6 w-20 border-2 border-border bg-secondary', className)} />
}

/** Mirrors `ProjectStatus` in `@/components/site/os-ui` (the lifecycle chip). */
export function PixelSkeletonStatus({ className }: { className?: string }) {
  return <PixelSkeletonBlock className={cn('h-5 w-20 border-2 border-border bg-success-muted', className)} />
}

/**
 * The seeded pixel mosaic. Wraps the real `PlaceholderArt` — the artwork a
 * card shows when it has no cover image — so a pending cover is literally what
 * the loaded card will look like, not an arbitrary grey box. `PlaceholderArt`
 * is a pure presentational leaf, so importing it up here creates no cycle.
 * `className` carries the caller's cover geometry (`-mx-5 aspect-video` for a
 * card, `mb-6 max-h-105` for a detail page); the border and fill are added here
 * because every one of those covers has them.
 *
 * The real cover now declares its ratio through `AspectRatio ratio={BOX_ASPECT}`
 * (src/components/site/content/cover.tsx), and `aspect-video` here is the same
 * number by coincidence of Tailwind's `--aspect-video`. It must stay spelled
 * out rather than sharing the constant: these class strings are matched
 * verbatim by tests/content-skeletons.test.tsx, and a skeleton that reserved a
 * different box than the loaded card would make the page jump on swap.
 */
export function PixelSkeletonCover({ seed, className }: { seed: string; className?: string }) {
  return (
    <PixelSkeletonBlock
      aria-hidden="true"
      className={cn('relative block w-full overflow-hidden border-3 border-border bg-success-muted', className)}
    >
      <PlaceholderArt seed={seed} />
    </PixelSkeletonBlock>
  )
}

/**
 * The window chrome every skeleton sits in, mirroring `WindowFrame`. The title
 * and the three control dots are stubs; the real `WindowControls` are omitted
 * because they are interactive affordances, not pending data. The window's
 * icon glyph is kept because it is part of the chrome the reader recognises,
 * not content that was still loading.
 */
export function PixelSkeletonWindow({
  title,
  icon,
  backLabel,
  children,
}: {
  title: string
  icon: string
  /** The pending title-bar back control. A `<span>`, never a link. */
  backLabel?: string
  children: ReactNode
}) {
  return (
    <section
      className="window-frame overflow-hidden border-3 border-border bg-card shadow-os"
      data-window-title={title}
    >
      <div className="window-titlebar flex min-h-9 items-center justify-between gap-3 border-b-3 border-border bg-primary px-2 py-1 pl-3 text-xs font-black tracking-widest text-foreground uppercase">
        <div className="inline-flex min-w-0 items-center gap-3">
          {backLabel ? (
            <span aria-hidden="true" className="window-back" data-back-label={backLabel}>
              <PixelSkeletonBar width={40} />
            </span>
          ) : null}
          <span aria-hidden="true" className="window-title inline-flex items-center gap-2">
            <PixelIcon className="text-foreground" glyph={icon} />
            <PixelSkeletonBar className="h-2.5" width={40} />
          </span>
        </div>
        <span aria-hidden="true" className="inline-flex items-center gap-1.5">
          <PixelSkeletonBlock className="size-2.5" />
          <PixelSkeletonBlock className="size-2.5" />
          <PixelSkeletonBlock className="size-2.5" />
        </span>
      </div>
      <div className="window-content p-6 sm:p-8 lg:p-12">{children}</div>
    </section>
  )
}
