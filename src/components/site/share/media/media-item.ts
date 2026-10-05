import { safeAssetHref } from '@/lib/content/url'
import type { CoverImage } from '@/server/content/types'

/**
 * The viewer-facing image shape, deliberately decoupled from the CMS types so
 * the gallery and the viewer stay reusable. `src` is already sanitized by
 * `toMediaItem`; nothing in this module parses URLs. `caption` is
 * `string | null`, never `undefined`, so callers can render it directly.
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
 * Payload's fixed-size `imageSizes` are crops (sharp's default `cover` fit with
 * a `position`), not width-preserving derivatives: `thumbnail` is 320x240
 * (4:3) while `card`/`hero` are 16:9. A `srcset` whose candidates disagree
 * with the box they will be painted into is invalid — the browser picks by
 * width alone and then lays the chosen file out using the ORIGINAL's ratio.
 * Only the `gallerySm`/`galleryLg` sizes are width-preserving (`fit: 'inside'`),
 * so they are the only non-cropped derivatives a `srcset` may offer.
 *
 * The reference is whatever actually determines the rendered box:
 *
 * - `box` — the box fixes the ratio (`AspectRatio` + `object-cover`), so a crop
 *   that does not match the BOX is wrong even when it matches the original. The
 *   covers are this case: a card or detail cover crops whatever was uploaded
 *   into a 16:9 frame on screen, so a 1:1 or 3:2 upload must still be served
 *   the 16:9 derivatives.
 * - `original` — the box is unconstrained and the image renders at its own
 *   ratio, so a derivative is only valid if it preserves the original's ratio.
 *   Gallery tiles, prose images, and the viewer's hero are this case: each is
 *   painted at its intrinsic ratio and never cropped.
 *
 * Judging the `box` case against the original left every non-16:9 upload with
 * an EMPTY candidate list, so no `srcset` was emitted and the browser fell
 * back to `src` — the full-resolution original — on cards that render a third
 * of a grid column.
 */
export type SrcSetAspectReference = 'box' | 'original'

/**
 * The ratio every fixed crop box paints into: 16:9. Passed as
 * `AspectRatio ratio={BOX_ASPECT}` by the covers and by the gallery tile's
 * no-intrinsic-dimensions fallback.
 *
 * Numerically identical to Tailwind's `--aspect-video`, which is why the pixel
 * skeletons still spell the same ratio as `aspect-video` and must keep doing
 * so: a skeleton has to reserve exactly the box the loaded card will take.
 */
export const BOX_ASPECT = 16 / 9

const ASPECT_TOLERANCE = 0.02

/**
 * An image's own width ÷ height, or `null` when its dimensions are unknown.
 *
 * `null` is the honest answer rather than a default: a caller that needs to
 * reserve a box has no ratio to reserve, and only a `w`-descriptor candidate
 * check may conclude that nothing can be proven and offer no source at all.
 */
export function intrinsicRatio(size: { width?: number | null; height?: number | null }): number | null {
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
  const candidateAspect = intrinsicRatio(candidate)
  if (candidateAspect === null) return false
  const targetAspect = reference === 'box' ? BOX_ASPECT : intrinsicRatio(original)
  // Nothing to prove the candidate against, so offer none rather than a
  // possibly-distorted one.
  if (targetAspect === null) return false

  return Math.abs(candidateAspect - targetAspect) / Math.max(targetAspect, candidateAspect) <= ASPECT_TOLERANCE
}

/**
 * The smallest generated variant, used for fixed-size chrome such as the
 * viewer's filmstrip thumbnails — 84x60 boxes, so only bytes matter.
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
 * `reference` defaults to `'box'` because `ContentCover` is the only caller that
 * paints into a fixed 16:9 frame. Call sites rendering an image at its own
 * ratio must pass `'original'`, or a 16:9 crop of a portrait upload would
 * arrive stretched.
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
 *
 * A viewer item is by definition painted at its intrinsic ratio — a gallery
 * tile reserves the image's own box and the viewer's hero is contained, so
 * `'original'` is the only reference that can ever be correct here. A box
 * reference would hand a square or portrait image a 16:9 crop and stretch it.
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
    srcSet: coverSrcSet(image, 'original'),
    thumbSrc: thumbSource(image),
  }
}

/**
 * The same conversion for a Lexical `upload` node as rendered inside
 * `RichText`. At render time the node's `value` is a populated media document
 * (`url`, `alt`, `width`, `height`, `sizes`), so it matches `CoverImage` and can
 * reuse `coverSrcSet`. Upload nodes carry no caption, hence `caption: null`,
 * and prose images paint at their intrinsic ratio like every other viewer item.
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
 *
 * The allowlist mirrors the five names in the Media collection's
 * `upload.imageSizes`; an unknown key is dropped rather than passed through, so
 * a size removed from that config cannot leak into a `srcset`.
 */
function imageSizes(value: unknown): CoverImage['sizes'] | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined

  const sizes: NonNullable<CoverImage['sizes']> = {}
  for (const [name, size] of Object.entries(value)) {
    if (name !== 'thumbnail' && name !== 'card' && name !== 'hero' && name !== 'gallerySm' && name !== 'galleryLg')
      continue
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
