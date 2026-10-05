import { useStore } from '@tanstack/react-store'
import { cn } from 'cn'
import { useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '@/components/hooks/use-mobile'
import { visiblePages } from '@/components/site/content/visible-pages'
import { osStore } from '@/lib/os-store'

export const FEATURED_AUTOPLAY_MS = 5_000

/**
 * The page squares copy `ContentPagination`'s treatment rather than a class in
 * `src/styles/`, because an unlayered rule in a stylesheet would lose to those
 * literal utilities. The active and disabled treatments are the same two
 * literals used there.
 */
const pageSquareClass =
  'inline-flex size-10 items-center justify-center border-3 border-border bg-card font-black tracking-wider text-foreground uppercase shadow-os-sm transition-all duration-100 ease-out hover:not-disabled:translate-x-0.5 hover:not-disabled:translate-y-0.5 hover:not-disabled:bg-accent hover:not-disabled:shadow-os-xs'

const activePageSquareClass = 'bg-primary text-primary-foreground shadow-os-xs'

const disabledPageSquareClass = 'pointer-events-none opacity-40'

/**
 * In-window page picker for a maximized featured window.
 *
 * `ContentPagination` cannot be reused: it renders route anchors built from
 * `basePath` plus search params, while this control owns component state. It
 * does reuse `visiblePages`, so the page window and gap markers are identical to
 * every other listing.
 *
 * Page numbers shown are 1-based; `current` is the zero-based slice index.
 */
export function FeaturedWindowPagination({
  current,
  totalPages,
  onSelect,
  label,
}: {
  current: number
  totalPages: number
  onSelect: (page: number) => void
  label: string
}) {
  if (totalPages <= 1) return null

  const atFirst = current <= 0
  const atLast = current >= totalPages - 1
  const displayPage = current + 1

  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        aria-disabled={atFirst || undefined}
        aria-label="Previous page"
        className={cn(pageSquareClass, atFirst && disabledPageSquareClass)}
        onClick={() => onSelect(Math.max(current - 1, 0))}
        type="button"
      >
        ←
      </button>

      {visiblePages(displayPage, totalPages).map((page, index) =>
        page === null ? (
          <span aria-hidden className="px-1 font-black text-muted-foreground" key={`gap-${index}`}>
            …
          </span>
        ) : (
          <button
            aria-current={page === displayPage ? 'page' : undefined}
            aria-label={`Go to page ${page}`}
            className={cn(pageSquareClass, page === displayPage && activePageSquareClass)}
            key={page}
            onClick={() => onSelect(page - 1)}
            type="button"
          >
            {page}
          </button>
        ),
      )}

      <button
        aria-disabled={atLast || undefined}
        aria-label="Next page"
        className={cn(pageSquareClass, atLast && disabledPageSquareClass)}
        onClick={() => onSelect(Math.min(current + 1, totalPages - 1))}
        type="button"
      >
        →
      </button>
    </nav>
  )
}

/**
 * The shared carousel/pagination state behind both home windows that rotate
 * through CMS content.
 *
 * Two indices live here and they are not interchangeable: `activeIndex` is the
 * carousel slide, and `page` is the zero-based index into the expanded grid's
 * pool. They are deliberately separate state because the two surfaces show
 * different sets — the note window rotates the three newest while paginating
 * every published note.
 */
export function useFeaturedCarousel({
  autoplayMs,
  count,
  poolCount,
  pageSize,
  windowId,
}: {
  /**
   * Autoplay interval in milliseconds, or `null` to advance only by hand.
   * `null` is the right choice for reading content — a note carousel that
   * rewrites the page under a visitor is worse than one they drive.
   */
  autoplayMs: number | null
  /** Slides the small window rotates through. */
  count: number
  /** Total items the maximized window paginates. */
  poolCount: number
  pageSize: number
  /** `WindowFrame`'s `windowId`, which defaults to the window title. */
  windowId: string
}) {
  const windowMode = useStore(osStore, (state) => state.windowModes[windowId] ?? 'normal')
  const isMobile = useIsMobile()
  // `WindowFrame` forces 'normal' on mobile and hides minimized content itself,
  // so both are mirrored here rather than reimplemented.
  const isExpanded = !isMobile && windowMode === 'maximized'
  const isVisible = !isMobile && windowMode !== 'minimized'

  const [activeIndex, setActiveIndex] = useState(0)
  const [pageState, setPageState] = useState(0)
  // Autoplay is not announced to screen readers; a deliberate control press
  // makes the carousel region live from then on.
  const [hasInteracted, setHasInteracted] = useState(false)

  // Loop: every jump is taken modulo the slide count, so the arrows wrap past
  // either end instead of disabling themselves at the boundaries.
  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return
      setActiveIndex(((next % count) + count) % count)
    },
    [count],
  )

  const handlePrevious = useCallback(() => {
    setHasInteracted(true)
    goTo(activeIndex - 1)
  }, [activeIndex, goTo])

  const handleNext = useCallback(() => {
    setHasInteracted(true)
    goTo(activeIndex + 1)
  }, [activeIndex, goTo])

  const handleDot = useCallback(
    (dotIndex: number) => {
      setHasInteracted(true)
      goTo(dotIndex)
    },
    [goTo],
  )

  useEffect(() => {
    // Nothing rotates when autoplay is off, when there is nothing to rotate
    // through, when the carousel is not the visible surface, or when the visitor
    // asked for reduced motion.
    if (autoplayMs === null || count < 2 || isExpanded || !isVisible) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let timer = 0
    const start = () => {
      window.clearInterval(timer)
      timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % count), autoplayMs)
    }
    // A backgrounded tab would otherwise burn through every slide unseen.
    const stop = () => window.clearInterval(timer)
    const onVisibilityChange = () => (document.hidden ? stop() : start())

    start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [autoplayMs, count, isExpanded, isVisible])

  const totalPages = Math.max(1, Math.ceil(poolCount / pageSize))

  // A CMS edit can drop an item while the window sits on a later page, so the
  // page is clamped where it is read. Correcting it from an effect instead
  // renders the stale page first, and the grid slices an out-of-range range
  // for that frame.
  const page = Math.min(pageState, totalPages - 1)
  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.max(0, Math.min(next, totalPages - 1)))
    },
    [totalPages],
  )

  return {
    activeIndex,
    isExpanded,
    goTo,
    handleDot,
    handleNext,
    handlePrevious,
    hasInteracted,
    page,
    setPage,
    totalPages,
  }
}
