import { canonicalUrl } from '@/lib/seo/site-seo'
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
}

type ContentMetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

export interface ContentMeta {
  meta: ContentMetaDescriptor[]
  links: { rel: string; href: string }[]
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
  tags,
  title: fallbackTitle,
}: ContentMetaInput): ContentMeta {
  const title = seo.title?.trim() || fallbackTitle
  const description = seo.description?.trim() || fallbackDescription
  const image = seo.image.url ? seo.image : fallbackImage
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

  if (image.url) {
    meta.push({ property: 'og:image', content: image.url })
    if (image.alt) meta.push({ property: 'og:image:alt', content: image.alt })
  }

  meta.push(
    { name: 'twitter:card', content: image.url ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  )

  if (image.url) {
    meta.push({ name: 'twitter:image', content: image.url })
    if (image.alt) meta.push({ name: 'twitter:image:alt', content: image.alt })
  }

  if (kind === 'article') {
    if (publishedTime) meta.push({ property: 'article:published_time', content: publishedTime })
    if (modifiedTime) meta.push({ property: 'article:modified_time', content: modifiedTime })
    for (const tag of tags ?? []) meta.push({ property: 'article:tag', content: tag })
  }

  return { meta, links: [{ rel: 'canonical', href: canonical }] }
}
