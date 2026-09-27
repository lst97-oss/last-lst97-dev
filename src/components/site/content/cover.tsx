import type { CoverImage } from '../../../server/content/types'
import { safeAssetHref } from '../../../lib/content-url'

export function ContentCover({ image, className = 'content-cover' }: { image: CoverImage; className?: string }) {
  const src = safeAssetHref(image.url)
  if (!src) return null

  return (
    <figure className={className}>
      <img alt={image.alt ?? ''} decoding="async" loading="lazy" src={src} />
    </figure>
  )
}
