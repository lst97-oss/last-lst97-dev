'use client'

import { useState } from 'react'
import { MediaViewer, type MediaViewerItem } from '@/components/site/share/media'

/**
 * A Lexical `upload` node rendered inside `RichText`. The converter is a pure
 * function and cannot hold React state, so the click-to-open behaviour lives
 * here: `RichText` delegates to this component and passes the article's full
 * image list plus this node's index, so an article with several images opens one
 * viewer that steps through all of them.
 *
 * The `<img>` carries the same aspect-checked width-descriptor `srcSet` as the
 * covers and gallery, plus explicit dimensions so the browser reserves the box
 * before the bytes arrive. Prose images sit far below the fold, so they are
 * lazy and async-decoded.
 */
export function ProseImage({
  items,
  index,
  srcSet,
  alt,
}: {
  items: MediaViewerItem[]
  index: number
  srcSet: string | undefined
  alt: string
}) {
  const [open, setOpen] = useState<number | null>(null)
  const item = items[index]
  if (!item) return null

  return (
    <>
      <button
        aria-label={alt ? `View full size image: ${alt}` : 'View full size image'}
        className="media-trigger"
        onClick={() => setOpen(index)}
        type="button"
      >
        <img
          alt={alt}
          decoding="async"
          height={item.height}
          loading="lazy"
          sizes="(min-width: 1024px) 768px, 100vw"
          src={item.src}
          srcSet={srcSet}
          width={item.width}
        />
      </button>
      <MediaViewer
        index={open}
        items={items}
        onClose={() => setOpen(null)}
        onIndexChange={setOpen}
        title="image-viewer"
      />
    </>
  )
}
