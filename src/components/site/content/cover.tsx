import { cn } from 'cn'
import type { ReactNode } from 'react'
import { coverSrcSet } from '@/components/site/share/media/media-item'
import { safeAssetHref } from '@/lib/content/url'
import type { CoverImage } from '@/server/content/types'

export function ContentCover({
  image,
  className = 'content-cover',
  priority = false,
  fallback,
  sizes,
}: {
  image: CoverImage
  className?: string
  priority?: boolean
  fallback?: ReactNode
  /**
   * Width descriptor for candidate selection. Callers pass the real rendered
   * width, because the default below is only correct for the card grid: a
   * lone card in a window is as wide as the window, not a third of a grid.
   */
  sizes?: string
}) {
  const src = safeAssetHref(image.url)
  const isCardCover = className.includes('card-cover')
  const isDetailCover = className.includes('content-detail-cover')
  const wrapperClass = cn(
    'content-cover overflow-hidden border-3 border-border bg-success-muted',
    // `w-full` (not `w-auto`): the card cover bleeds with -mx-5, so a shrink-to-fit
    // width would collapse a content-sized fallback such as PlaceholderArt, which
    // has no intrinsic size of its own.
    isCardCover && '-mx-5 mb-4 aspect-video w-full border-x-0 border-t-0',
    isDetailCover && 'mb-6 aspect-video max-h-105',
    className,
  )

  if (!src) return fallback ? <figure className={wrapperClass}>{fallback}</figure> : null

  const srcSet = coverSrcSet(image)

  // Card columns are a third of the grid above `xl` and half below it; the
  // detail cover is capped at 768px by its own max-height. A caller that
  // knows a different width — the home page's single featured card, which
  // fills its window — passes its own descriptor.
  const resolvedSizes = sizes ?? (isCardCover ? '(min-width: 1280px) 33vw, 50vw' : '(min-width: 1024px) 768px, 100vw')

  return (
    <figure className={wrapperClass}>
      {/* `decoding` follows `loading`: the one cover that can be the LCP
          candidate gets `sync` so the browser does not paint the frame before
          the pixels land; lazy off-screen covers get `async`. */}
      <img alt={image.alt ?? ''} className="block size-full object-cover" decoding={priority ? 'sync' : 'async'} fetchPriority={priority ? 'high' : 'auto'} height={image.height ?? undefined} loading={priority ? 'eager' : 'lazy'} sizes={resolvedSizes} src={src} srcSet={srcSet || undefined} width={image.width ?? undefined} />
    </figure>
  )
}
