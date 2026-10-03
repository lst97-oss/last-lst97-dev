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
 * How a candidate's aspect ratio is judged before it may join a `w`-descriptor
 * `srcset`.
 *
 * Payload's `imageSizes` are fixed-aspect crops (sharp's default `cover` fit
 * with a `position`), not width-preserving derivatives: `thumbnail` is
 * 320x240 (4:3) while `card`/`hero` are 16:9. A `srcset` whose candidates
 * disagree with the box they will be painted into is invalid — the browser
 * picks by width alone and then lays the chosen file out using the ORIGINAL's
 * ratio, so a mismatched candidate arrives stretched or wrongly cropped.
 *
 * The reference is therefore whatever actually determines the rendered box,
 * and that differs by call site:
 *
 * - `box` — the CSS box fixes the ratio (`aspect-video` + `object-cover`), so a
   crop that does not match the BOX is wrong even when it matches the original.
   Covers and gallery tiles are `aspect-video`, which is why a 1:1 or 3:2
 *   upload must still be served the 16:9 derivatives: `object-cover` crops
 *   them into the box on screen regardless of what the browser fetched.
 * - `original` — the box is unconstrained and the image renders at its own
 *   ratio, so a derivative is only valid if it preserves the original's ratio.
 *   Prose images are this case: `.media-trigger` sets no aspect and no
 *   `object-fit`, so the image lays out at its intrinsic ratio.
 *
 * Judging the `box` case against the original (the previous behaviour) meant
 * every non-16:9 upload produced an EMPTY candidate list, so no `srcset` was
 * emitted at all and the browser fell back to `src` — the full-resolution
 * original — on cards that render a third of a grid column.
 */
export type SrcSetAspectReference = 'box' | 'original'

/** The ratio every `aspect-video` box paints into: 16:9. */
const BOX_ASPECT = 16 / 9

const ASPECT_TOLERANCE = 0.02

function aspectOf(size: { width?: number | null; height?: number | null }): number | null {
  const { width, height } = size
  if (typeof width !== 'number' || typeof height !== 'number') return null
  if (width <= 0 || height <= 0) return null
  return width / height
}

/**
 * Whether a candidate can stand in for the original, judged against the
 * surface it will actually be painted into.
 */
function matchesAspect(
  candidate: { width?: number | null; height?: number | null },
  original: { width?: number | null; height?: number | null },
  reference: SrcSetAspectReference,
): boolean {
  const candidateAspect = aspectOf(candidate)
  if (candidateAspect === null) return false
  const targetAspect = reference === 'box' ? BOX_ASPECT : aspectOf(original)
  // Nothing to prove the candidate against, so offer none rather than a
  // possibly-distorted one.
  if (targetAspect === null) return false

  return Math.abs(candidateAspect - targetAspect) / Math.max(targetAspect, candidateAspect) <= ASPECT_TOLERANCE
}

/**
 * The smallest generated variant, used for fixed-size chrome such as the
 * viewer's filmstrip thumbnails. Those boxes are `object-fit: cover`, so
 * aspect ratio does not matter — only bytes, and a 320px derivative instead of
 * the full original is a large saving in a long gallery.
 */
function thumbSource(image: CoverImage): string | undefined {
  const thumbnail = image.sizes?.thumbnail
  return thumbnail?.url ? (safeAssetHref(thumbnail.url) ?? undefined) : undefined
}

/**
 * Single source for the responsive `srcSet` built from a Payload image's
 * `sizes`. Extracted from `ContentCover` so the gallery, the covers, and the
 * viewer all size the same images identically. Invalid size URLs drop out via
 * the leading-space filter, candidates whose aspect ratio disagrees with the
 * surface they render into drop out via `matchesAspect`, and an empty result
 * omits the attribute so the browser falls back to `src`.
 *
 * `reference` defaults to `'box'` because every cover and gallery tile is an
 * `aspect-video` box that crops with `object-cover`. Call sites rendering an
 * image at its intrinsic ratio (prose images) must pass `'original'`, or a
 * 16:9 crop of a portrait upload would arrive stretched.
 */
export function coverSrcSet(image: CoverImage, reference: SrcSetAspectReference = 'box'): string | undefined {
  const variants = Object.values(image.sizes ?? {}).filter(
    (size): size is NonNullable<typeof size> =>
      Boolean(size?.url) && typeof size.width === 'number' && matchesAspect(size, image, reference),
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
  options?: { caption?: string | null; altFallback?: string; aspectReference?: SrcSetAspectReference },
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
    srcSet: coverSrcSet(image, options?.aspectReference ?? 'box'),
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
 * Defaults to the `'original'` aspect reference because prose images render
 * inside `.media-trigger`, which sets no aspect ratio and no `object-fit`: the
 * image is painted at its intrinsic ratio. Offering it a 16:9 crop would
 * distort a portrait or square upload, so these keep the stricter rule.
 *
 * `toMediaItem` stays the one place that decides whether a URL is safe.
 */
export function uploadToMediaItem(
  value: {
    url?: unknown
    alt?: unknown
    width?: unknown
    height?: unknown
    sizes?: unknown
  },
  options?: { aspectReference?: SrcSetAspectReference },
): MediaViewerItem | null {
  return toMediaItem(
    {
      url: typeof value.url === 'string' ? value.url : null,
      alt: typeof value.alt === 'string' ? value.alt : null,
      width: typeof value.width === 'number' ? value.width : null,
      height: typeof value.height === 'number' ? value.height : null,
      sizes: imageSizes(value.sizes),
    },
    { aspectReference: options?.aspectReference ?? 'original' },
  )
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
