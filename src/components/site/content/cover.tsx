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
}: {
  image: CoverImage
  className?: string
  priority?: boolean
  fallback?: ReactNode
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

  // The wrapper is `aspect-video` with a `max-h` ceiling, and its container is
  // the card grid's column or the detail layout's `max-w-4xl`. Card columns
  // are a third of the grid above `xl` and half below it; the detail cover is
  // capped at 768px by its own max-height, which is the number that matters
  // for candidate selection.
  const sizes = isCardCover ? '(min-width: 1280px) 33vw, 50vw' : '(min-width: 1024px) 768px, 100vw'

  return (
    <figure className={wrapperClass}>
      {/* `decoding` follows `loading`: the one cover that can be the LCP
          candidate gets `sync` so the browser does not paint the frame before
          the pixels land; lazy off-screen covers get `async`. */}
      <img alt={image.alt ?? ''} className="block size-full object-cover" decoding={priority ? 'sync' : 'async'} fetchPriority={priority ? 'high' : 'auto'} height={image.height ?? undefined} loading={priority ? 'eager' : 'lazy'} sizes={sizes} src={src} srcSet={srcSet || undefined} width={image.width ?? undefined} />
    </figure>
  )
}
