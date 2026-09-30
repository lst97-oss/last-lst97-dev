import { safeAssetHref } from '@/lib/content/url'
import type { CoverImage } from '@/server/content/types'

/**
 * The viewer-facing image shape, deliberately decoupled from the CMS types so
 * the gallery and the viewer stay reusable. `src` is already sanitized by
 * `toMediaItem`; nothing in this module parses URLs. `caption` is
 * `string | null` (never `undefined`) to match `ProjectGalleryItem`.
 */
export type MediaViewerItem = {
  src: string
  alt: string
  caption: string | null
  width?: number
  height?: number
  srcSet?: string
  /**
   * A small derivative for the viewer's filmstrip, or `undefined` when the CMS
   * generated none. Never the original: the thumbnails are 84x60 boxes, so
   * fetching the full-size file for each one dominates the viewer's bytes.
   */
  thumbSrc?: string
}

/**
 * How far a candidate's aspect ratio may drift from the original's before it
 * stops being a valid `w`-descriptor candidate.
 *
 * Payload's `imageSizes` are fixed-aspect crops (sharp's default `cover` fit
 * with a `position`), not width-preserving derivatives: `thumbnail` is
 * 320x240 (4:3) while `card`/`hero` are 16:9. A `srcset` whose candidates
 * disagree on aspect ratio is invalid — the browser picks by width alone and
 * then lays the image out from the ORIGINAL's ratio, so a mismatched candidate
 * arrives stretched, cropped, or at the wrong size. Requiring every candidate
 * to match the original is what makes `object-fit: contain` and natural
 * rendering safe, and it still lets 16:9 covers use the 16:9 derivatives.
 */
const ASPECT_TOLERANCE = 0.02

/**
 * Whether a candidate can stand in for the original, judged on aspect ratio.
 * Without the original's dimensions nothing can be proven, so no candidate is
 * offered rather than a possibly-distorted one.
 */
function matchesOriginalAspect(
  candidate: { width?: number | null; height?: number | null },
  original: { width?: number | null; height?: number | null },
): boolean {
  const candidateWidth = candidate.width
  const candidateHeight = candidate.height
  if (typeof candidateWidth !== 'number' || typeof candidateHeight !== 'number') return false
  const originalWidth = original.width
  const originalHeight = original.height
  if (typeof originalWidth !== 'number' || typeof originalHeight !== 'number') return false
  if (originalWidth <= 0 || originalHeight <= 0 || candidateHeight <= 0) return false

  const originalAspect = originalWidth / originalHeight
  const candidateAspect = candidateWidth / candidateHeight

  return Math.abs(candidateAspect - originalAspect) / Math.max(originalAspect, candidateAspect) <= ASPECT_TOLERANCE
}

/**
 * The smallest generated variant, used for fixed-size chrome such as the
 * viewer's filmstrip thumbnails. Those boxes are `object-fit: cover`, so
 * aspect ratio does not matter — only bytes, and a 320px derivative instead of
 * the full original is a large saving in a long gallery.
 */
function thumbSource(image: CoverImage): string | undefined {
  const thumbnail = image.sizes?.thumbnail
  return thumbnail?.url ? safeAssetHref(thumbnail.url) ?? undefined : undefined
}

/**
 * Single source for the responsive `srcSet` built from a Payload image's
 * `sizes`. Extracted from `ContentCover` so the gallery, the covers, and the
 * viewer all size the same images identically. Invalid size URLs drop out via
 * the leading-space filter, candidates whose aspect ratio disagrees with the
 * original drop out via `matchesOriginalAspect`, and an empty result omits the
 * attribute so the browser falls back to `src`.
 */
export function coverSrcSet(image: CoverImage): string | undefined {
  const variants = Object.values(image.sizes ?? {}).filter(
    (size): size is NonNullable<typeof size> =>
      Boolean(size?.url) && typeof size.width === 'number' && matchesOriginalAspect(size, image),
  )
  const srcSet = variants
    .map((size) => `${safeAssetHref(size.url) ?? ''} ${size.width}w`)
    .filter((entry) => !entry.startsWith(' w'))
    .join(', ')

  return srcSet || undefined
}

/**
 * Convert a CMS `CoverImage` into a viewer item, or `null` when the URL is not
 * safe to render. The `null` case follows the convention already used by
 * `ContentCover`: an unsafe image renders nothing at all rather than a broken
 * element, so callers filter with `flatMap`.
 */
export function toMediaItem(
  image: CoverImage,
  options?: { caption?: string | null; altFallback?: string },
): MediaViewerItem | null {
  const src = safeAssetHref(image.url)
  if (!src) return null

  const caption = options?.caption ?? null

  return {
    src,
    alt: image.alt ?? options?.altFallback ?? caption ?? '',
    caption,
    width: typeof image.width === 'number' ? image.width : undefined,
    height: typeof image.height === 'number' ? image.height : undefined,
    srcSet: coverSrcSet(image),
    thumbSrc: thumbSource(image),
  }
}

/**
 * The same conversion for a Lexical `upload` node as rendered inside
 * `RichText`. At render time the node's `value` is a populated media document
 * (`url`, `alt`, `width`, `height`, `sizes`) rather than the bare id the
 * serialized form stores, so it matches `CoverImage` and can reuse
 * `coverSrcSet`. Upload nodes carry no caption, hence `caption: null`.
 *
 * `toMediaItem` stays the one place that decides whether a URL is safe.
 */
export function uploadToMediaItem(value: {
  url?: unknown
  alt?: unknown
  width?: unknown
  height?: unknown
  sizes?: unknown
}): MediaViewerItem | null {
  return toMediaItem({
    url: typeof value.url === 'string' ? value.url : null,
    alt: typeof value.alt === 'string' ? value.alt : null,
    width: typeof value.width === 'number' ? value.width : null,
    height: typeof value.height === 'number' ? value.height : null,
    sizes: imageSizes(value.sizes),
  })
}

/**
 * The upload node's `sizes` is a populated media-sizes object keyed by name,
 * which is exactly `CoverImage['sizes']`. A non-object is not a valid sizes
 * map, so it drops the responsive sources rather than guessing.
 */
function imageSizes(value: unknown): CoverImage['sizes'] | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined

  const sizes: NonNullable<CoverImage['sizes']> = {}
  for (const [name, size] of Object.entries(value)) {
    if (name !== 'thumbnail' && name !== 'card' && name !== 'hero') continue
    if (typeof size !== 'object' || size === null) continue
    const { url, width, height } = size as Record<string, unknown>
    sizes[name] = {
      url: typeof url === 'string' ? url : null,
      width: typeof width === 'number' ? width : null,
      height: typeof height === 'number' ? height : null,
    }
  }

  return Object.keys(sizes).length > 0 ? sizes : undefined
}

