import {
  absoluteUrl,
  canonicalUrl,
  createOgImageAlt,
  createOgImagePath,
  SITE_NAME,
  SITE_OG_IMAGE_HEIGHT,
  SITE_OG_IMAGE_WIDTH,
  SITE_TAGLINE,
} from '@/lib/seo/site-seo'
import type { CoverImage, SEOOverrides } from '../../server/content/types'

interface ContentMetaInput {
  description: string
  image: CoverImage
  kind: 'article' | 'website'
  seo: SEOOverrides
  title: string
  /** Public pathname for the canonical link and `og:url`, e.g. `/blog/a-post`. */
  pathname: string
  /** ISO date for `article:published_time` on article pages. */
  publishedTime?: string | null
  /** ISO date for `article:modified_time` on article pages. */
  modifiedTime?: string | null
  tags?: readonly string[]
  structuredData?: Record<string, unknown>
}

type ContentMetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

export interface ContentMeta {
  meta: ContentMetaDescriptor[]
  links: { rel: string; href: string }[]
  scripts?: { type: string; children: string }[]
}

export interface ContentShare {
  /** Absolute canonical URL; identical to the emitted `<link rel="canonical">`. */
  url: string
  title: string
  description: string
  /**
   * The card image. `url` is never null — a document with no cover gets a
   * generated card over the site artwork — and `isDefault` lets the share
   * preview label that fallback instead of passing it off as document artwork.
   */
  image: {
    url: string
    alt: string
    width: number
    height: number
    isDefault: boolean
  }
}

/**
 * The values a social scraper will read, resolved exactly as `createContentMeta`
 * resolves them: SEO overrides beat editorial fields, and the social card
 * prefers the bounded `hero` derivative over the full-resolution original.
 * The share dialog previews these, so the precedence lives here once rather
 * than being re-derived in a component that would drift from `og:*`.
 */
export function resolveContentShare({
  description: fallbackDescription,
  image: fallbackImage,
  pathname,
  seo,
  title: fallbackTitle,
}: Pick<ContentMetaInput, 'description' | 'image' | 'pathname' | 'seo' | 'title'>): ContentShare {
  const title = seo.title?.trim() || fallbackTitle
  const description = seo.description?.trim() || fallbackDescription
  const image = seo.image.url ? seo.image : fallbackImage
  // Social scrapers fetch `og:image` on every crawl, so it must not point at
  // the full-resolution original. `hero` (1600x900) exists for exactly this
  // and is a bounded derivative; the original is the fallback so a cover whose
  // upload predates the size still emits a valid card.
  const hero = image.sizes?.hero
  const socialImage =
    hero?.url && hero.width && hero.height
      ? { url: hero.url, alt: image.alt, width: hero.width, height: hero.height }
      : image
  // OG and Twitter reject relative image URLs, and a same-origin cover would
  // emit one. `absoluteUrl` leaves already-absolute R2 media untouched, so this
  // only rewrites the cases that are actually broken.
  const imageUrl = absoluteUrl(socialImage.url)

  if (!imageUrl) {
    return {
      url: canonicalUrl(pathname),
      title,
      description,
      image: {
        url: absoluteUrl(createOgImagePath(title, description)) ?? '',
        alt: createOgImageAlt(title, description),
        width: SITE_OG_IMAGE_WIDTH,
        height: SITE_OG_IMAGE_HEIGHT,
        isDefault: true,
      },
    }
  }

  return {
    url: canonicalUrl(pathname),
    title,
    description,
    image: {
      url: imageUrl,
      alt: socialImage.alt ?? `${SITE_NAME} — ${SITE_TAGLINE}`,
      // `0` means "Payload recorded no intrinsic size", not "a zero-pixel
      // image": `createContentMeta` treats a falsy width as unknown and omits
      // the tag, because a wrong declared size crops the card.
      width: socialImage.width ?? 0,
      height: socialImage.height ?? 0,
      isDefault: false,
    },
  }
}

/**
 * Builds head tags for a CMS-backed detail page. SEO overrides from the editor
 * win over the editorial fields, and every page gets a canonical link so
 * duplicate query-string URLs do not split ranking signals.
 */
export function createContentMeta({
  description: fallbackDescription,
  image: fallbackImage,
  kind,
  modifiedTime,
  pathname,
  publishedTime,
  seo,
  structuredData,
  tags,
  title: fallbackTitle,
}: ContentMetaInput): ContentMeta {
  // One precedence implementation: the share dialog previews the same values
  // from `resolveContentShare`, so a preview can never disagree with `og:*`.
  const share = resolveContentShare({
    description: fallbackDescription,
    image: fallbackImage,
    pathname,
    seo,
    title: fallbackTitle,
  })
  const { description, title } = share
  const meta: ContentMetaDescriptor[] = [
    { title: `${title} — LAST//OS` },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow, max-image-preview:large' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: kind },
    { property: 'og:url', content: share.url },
    { property: 'og:site_name', content: 'LAST//OS' },
  ]

  meta.push({ property: 'og:image', content: share.image.url })
  meta.push({ property: 'og:image:alt', content: share.image.alt })
  if (share.image.isDefault) meta.push({ property: 'og:image:type', content: 'image/webp' })
  if (share.image.width && share.image.height) {
    meta.push(
      { property: 'og:image:width', content: String(share.image.width) },
      { property: 'og:image:height', content: String(share.image.height) },
    )
  }

  meta.push(
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: share.image.url },
    { name: 'twitter:image:alt', content: share.image.alt },
  )

  if (kind === 'article') {
    if (publishedTime) meta.push({ property: 'article:published_time', content: publishedTime })
    if (modifiedTime) meta.push({ property: 'article:modified_time', content: modifiedTime })
    for (const tag of tags ?? []) meta.push({ property: 'article:tag', content: tag })
  }

  return {
    meta,
    links: [{ rel: 'canonical', href: share.url }],
    ...(structuredData === undefined
      ? {}
      : {
          scripts: [
            {
              type: 'application/ld+json',
              children: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
            },
          ],
        }),
  }
}
