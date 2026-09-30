import { cn } from 'cn'
import { type ReactNode, useState } from 'react'
import type { MediaViewerItem } from './media-item'
import { MediaViewer } from './media-viewer'

/**
 * Gallery grid plus its viewer. It owns the open index so a call site only has
 * to hand over a list of items — no duplicated `useState` per surface.
 *
 * The tile markup is the project gallery's existing markup, unchanged, so
 * adding the viewer does not alter the grid's appearance.
 */
export function ImageGallery({ items, heading }: { items: MediaViewerItem[]; heading?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // Defensive: `toMediaItem` already dropped unsafe URLs, but a hand-built
  // list must not be able to render a tile with no source.
  const usable = items.filter((item) => typeof item.src === 'string' && item.src.length > 0)
  // React keys are the image itself, not its position: an index key makes every
  // tile after a dropped entry remount, which discards decoded images and loses
  // the viewer's open state. The occurrence counter only disambiguates a
  // genuinely duplicated upload, so a reordered or filtered list keeps its keys.
  const occurrences: Record<string, number> = {}
  const tiles = usable.map((item, index) => {
    const occurrence = occurrences[item.src] ?? 0
    occurrences[item.src] = occurrence + 1
    return { item, index, key: `${item.src}#${occurrence}` }
  })

  if (usable.length === 0) return null

  return (
    <>
      <section aria-label="Project image gallery" className="project-gallery mt-8">
        {heading ? <h2 className="mb-4 text-2xl">{heading}</h2> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {tiles.map(({ item, index, key }) => (
            <button
              aria-label={`View full size image: ${item.alt || `${heading ?? 'Gallery'} image ${index + 1}`}`}
              className="media-gallery-tile"
              key={key}
              onClick={() => setOpenIndex(index)}
              type="button"
            >
              <figure className="m-0 overflow-hidden border-3 border-border bg-card shadow-os-sm">
                <img
                  alt={item.alt || `${heading ?? 'Gallery'} image ${index + 1}`}
                  className="block aspect-video w-full object-cover"
                  decoding="async"
                  height={item.height}
                  loading="lazy"
                  // The grid is one column below `sm` and two columns above it,
                  // so 50vw is the real rendered width past that breakpoint.
                  // The old 33vw under-declared the fetch width, making the
                  // browser pick an unnecessarily large candidate.
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src={item.src}
                  srcSet={item.srcSet}
                  width={item.width}
                />
                {item.caption ? (
                  <figcaption className="p-3 text-sm text-muted-foreground">{item.caption}</figcaption>
                ) : null}
              </figure>
            </button>
          ))}
        </div>
      </section>

      <MediaViewer
        index={openIndex}
        items={usable}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
        title={heading ? `${heading.toLowerCase().replace(/\s+/g, '-')}.viewer` : 'image-viewer'}
      />
    </>
  )
}

/**
 * Single-image entry point, used to make a cover image open the same viewer.
 * With no viewable image the children render bare — no button, no wrapper — so a
 * page without a cover is completely unaffected.
 */
export function MediaTrigger({
  item,
  label,
  children,
}: {
  item: MediaViewerItem | null
  label?: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)

  if (!item) return <>{children}</>

  return (
    <>
      <button
        aria-label={label ?? 'View full size image'}
        className={cn('media-trigger')}
        onClick={() => setOpen(true)}
        type="button"
      >
        {children}
      </button>
      <MediaViewer
        index={open ? 0 : null}
        items={[item]}
        onClose={() => setOpen(false)}
        onIndexChange={() => setOpen(true)}
        title="image-viewer"
      />
    </>
  )
}
