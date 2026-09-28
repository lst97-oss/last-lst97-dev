import { cn } from 'cn'
import { safeAssetHref } from '@/lib/content/url'
import type { CoverImage } from '@/server/content/types'

export function ContentCover({ image, className = 'content-cover' }: { image: CoverImage; className?: string }) {
  const src = safeAssetHref(image.url)
  if (!src) return null

  const isCardCover = className.includes('card-cover')
  const isDetailCover = className.includes('content-detail-cover')

  return (
    <figure
      className={cn(
        'content-cover overflow-hidden border-3 border-border bg-success-muted',
        isCardCover && '-mx-5 mb-4 aspect-video w-auto border-x-0 border-t-0',
        isDetailCover && 'mb-6 aspect-video max-h-105',
        className,
      )}
    >
      <img alt={image.alt ?? ''} className="block size-full object-cover" decoding="async" loading="lazy" src={src} />
    </figure>
  )
}
