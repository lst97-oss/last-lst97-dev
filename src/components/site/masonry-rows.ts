import { type RefObject, useEffect, useRef } from 'react'

/**
 * Row-span packing for a CSS grid with tiny `grid-auto-rows`. Cards are measured
 * in the DOM and given `grid-row-end: span N`, so no React re-render is needed
 * per resize and there is no state feedback loop.
 *
 * The packing class is added imperatively once the first spans are written, for
 * the same reason: `grid-auto-rows: 8px` with no spans would collapse every card
 * to a single row, so the class cannot be in the server markup. Tracking that
 * with `useState` would mean a second render whose only job is to swap a class
 * string, so the effect owns it and the hook keeps no state at all.
 */

/** Must match `grid-auto-rows` in the `.card-masonry` rule (src/styles/content-cards.css). */
const MASONRY_ROW_PX = 8
/** Must match the card bottom margin `.card-masonry > *` applies. */
const MASONRY_MARGIN_PX = 14
const MASONRY_CLASS = 'card-masonry'

/**
 * Rows a card must reserve. Exported for the test that pins this invariant:
 * the divisor is the row pitch alone, because `row-gap` is 0 and the visual
 * gap is the card's own bottom margin. Dividing by row + gap under-reserves
 * roughly half the rows and lets neighbouring cards overlap.
 */
export function masonryRowSpan(cardHeight: number): number {
  return Math.max(1, Math.ceil((cardHeight + MASONRY_MARGIN_PX) / MASONRY_ROW_PX))
}

export function useMasonryRows(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const container = ref.current
    if (!container) return

    const spanFor = (element: HTMLElement): number => masonryRowSpan(element.getBoundingClientRect().height)

    const applySpans = (): void => {
      for (const child of container.children) {
        if (child instanceof HTMLElement) child.style.gridRowEnd = `span ${spanFor(child)}`
      }
    }

    applySpans()
    container.classList.add(MASONRY_CLASS)

    const observer = new ResizeObserver(() => applySpans())
    observer.observe(container)
    for (const child of container.children) observer.observe(child)

    return () => observer.disconnect()
  }, [])

  return ref
}
