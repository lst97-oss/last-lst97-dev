import { absoluteUrl, canonicalUrl } from '@/lib/seo/site-seo'
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
  /** JSON-LD graph for the page, emitted as a single ld+json script. */
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
  const resolvedImageUrl = absoluteUrl(socialImage.url)
  const canonical = canonicalUrl(pathname)
  const meta: ContentMetaDescriptor[] = [
    { title: `${title} — LAST//OS` },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow, max-image-preview:large' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: kind },
    { property: 'og:url', content: canonical },
    { property: 'og:site_name', content: 'LAST//OS' },
  ]

  if (resolvedImageUrl) {
    meta.push({ property: 'og:image', content: resolvedImageUrl })
    if (socialImage.alt) meta.push({ property: 'og:image:alt', content: socialImage.alt })
    // Payload records carry intrinsic sizes; a cover without them is skipped
    // rather than guessed at, because consumers size the card from these and a
    // wrong aspect ratio crops the image. The declared size always describes the
    // SAME file emitted as `og:image`, which is the hero derivative when one
    // exists — declaring the original's ratio on a 16:9 crop would skew it.
    if (socialImage.width && socialImage.height) {
      meta.push(
        { property: 'og:image:width', content: String(socialImage.width) },
        { property: 'og:image:height', content: String(socialImage.height) },
      )
    }
  }

  meta.push(
    { name: 'twitter:card', content: resolvedImageUrl ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  )

  if (resolvedImageUrl) {
    meta.push({ name: 'twitter:image', content: resolvedImageUrl })
    if (socialImage.alt) meta.push({ name: 'twitter:image:alt', content: socialImage.alt })
  }

  if (kind === 'article') {
    if (publishedTime) meta.push({ property: 'article:published_time', content: publishedTime })
    if (modifiedTime) meta.push({ property: 'article:modified_time', content: modifiedTime })
    for (const tag of tags ?? []) meta.push({ property: 'article:tag', content: tag })
  }

  return {
    meta,
    links: [{ rel: 'canonical', href: canonical }],
    // JSON-LD goes in `scripts`: the router narrows `head().meta` to plain React
    // meta props. `<` is escaped so no field value can close the script tag.
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
