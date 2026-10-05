import { cn } from 'cn'
import { useEffect, useRef } from 'react'
import { PixelIcon } from '@/components/site/pixel-icon'
import { MediaViewerKeyHint } from '@/components/site/share/media/media-viewer-key-hint'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MediaViewerItem } from './media-item'

export type MediaViewerProps = {
  items: MediaViewerItem[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  title?: string
}

// Reused verbatim from src/components/site/window/window-controls.tsx so the
// viewer's title bar matches every other window on the site.
const controlClass =
  'grid size-6 place-items-center border-2 border-border bg-transparent p-0 align-middle font-mono text-base leading-none font-black text-foreground hover:bg-accent'

/**
 * Full-size image viewer in the site's OS-window chrome.
 *
 * Controlled: `index === null` means closed, and the caller owns navigation
 * state so one viewer serves either a gallery or a single cover image. Escape,
 * focus trapping, focus restore, and backdrop dismissal all come from the
 * dialog primitive — do not re-implement them here.
 *
 * The `WindowFrame` component is deliberately not used: it reads and writes the
 * `osStore` window registry, and its maximized state is `position: fixed` with
 * its own z-index, which would escape the dialog portal and fight the overlay.
 * A viewer has no minimize or maximize, so it presents the same chrome
 * presentationally.
 */
export function MediaViewer({ items, index, onIndexChange, onClose, title = 'image-viewer' }: MediaViewerProps) {
  const filmstripRef = useRef<HTMLDivElement>(null)

  const item = index === null ? null : (items[index] ?? null)

  // Hooks must run unconditionally, so the closed/empty case returns after them
  // rather than before. With nothing to show there is no strip to scroll.
  useEffect(() => {
    const strip = filmstripRef.current
    if (!strip) return
    const viewport = strip.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
    const active = strip.querySelector<HTMLElement>('[aria-current="true"]')
    if (!viewport || !active) return
    // Scroll the strip's own viewport directly rather than with
    // `scrollIntoView`, which walks ancestors and also nudges the dialog's
    // scroll area and the page.
    const target = active.offsetLeft - (viewport.clientWidth - active.offsetWidth) / 2
    viewport.scrollTo({ left: Math.max(0, target) })
  }, [index])

  if (index === null || item === null) return null

  // `index` is narrowed to a number here; binding it keeps that narrowing in
  // the JSX below, where TypeScript cannot re-derive it from `item`.
  const activeIndex = index

  const goTo = (target: number) => {
    const wrapped = ((target % items.length) + items.length) % items.length
    onIndexChange(wrapped)
  }

  const hasMultiple = items.length > 1

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="media-viewer-dialog"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            goTo(activeIndex + 1)
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault()
            goTo(activeIndex - 1)
          }
        }}
        showCloseButton={false}
      >
        <div className="media-viewer-window window-frame">
          <div className="window-titlebar flex min-h-9 items-center justify-between gap-3 border-b-3 border-border bg-primary px-2 py-1 pl-3 text-xs font-black tracking-widest text-foreground uppercase">
            <span className="window-title inline-flex items-center gap-2">
              <PixelIcon className="text-foreground" glyph="▣" />
              {title}
            </span>
            <span className="window-controls inline-flex items-center gap-1.5">
              <button
                aria-label={`Close ${title}`}
                className={cn(controlClass, 'window-close')}
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </span>
          </div>

          {/* Mirrors `WindowFrame`'s structure: the title bar is a direct
              child of the frame and spans its full width, while the padded
              `.window-content` holds everything below it. Padding placed on
              the frame itself would inset the title bar too, which is not how
              any other window on the site looks. */}
          <div className="window-content media-viewer-body">
            {/* `decoding="sync"` is deliberate: this is the LCP candidate the
              moment the dialog opens, and async decode lets the browser paint
              the frame before the pixels arrive. Everywhere else the images
              are lazy and off-screen, where `async` is the better trade. */}
            <img
              alt={item.alt}
              className="media-viewer-image"
              decoding="sync"
              fetchPriority="high"
              height={item.height}
              loading="eager"
              sizes="(max-width: 768px) 100vw, 92vw"
              src={item.src}
              srcSet={item.srcSet}
              width={item.width}
            />

            {item.caption ? <p className="media-viewer-caption">{item.caption}</p> : null}

            {hasMultiple ? (
              <div className="media-viewer-controls">
                <button className="media-viewer-step" onClick={() => goTo(activeIndex - 1)} type="button">
                  ← PREV
                </button>
                <span className="media-viewer-counter">
                  {activeIndex + 1} OF {items.length}
                </span>
                <button className="media-viewer-step" onClick={() => goTo(activeIndex + 1)} type="button">
                  NEXT →
                </button>
              </div>
            ) : (
              <div className="media-viewer-controls">
                <span className="media-viewer-counter">1 OF 1</span>
              </div>
            )}

            {/* Why arrows/Escape are safe to advertise here, and why the row
                disappears below 650px, is stated in `media-viewer.css`. */}
            <MediaViewerKeyHint hasMultiple={hasMultiple} />

            {hasMultiple ? (
              <ScrollArea className="media-viewer-filmstrip" ref={filmstripRef} scrollbars="horizontal">
                <div className="media-viewer-filmstrip-row">
                  {items.map((thumb, thumbIndex) => (
                    <button
                      aria-current={thumbIndex === activeIndex ? 'true' : undefined}
                      aria-label={`View image ${thumbIndex + 1} of ${items.length}`}
                      className={cn('media-viewer-thumb', thumbIndex === activeIndex && 'is-active')}
                      key={`${thumb.src}-${thumbIndex}`}
                      onClick={() => goTo(thumbIndex)}
                      type="button"
                    >
                      {/* Thumbnails are decorative, so `alt` stays empty. They sit
                        below the fold inside the dialog and the boxes are 84x60
                        with `object-fit: cover`, so the 320px derivative is the
                        right source and lazy loading is correct. */}
                      <img
                        alt=""
                        decoding="async"
                        height={60}
                        loading="lazy"
                        src={thumb.thumbSrc ?? thumb.src}
                        width={84}
                      />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
