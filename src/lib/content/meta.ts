import type { CoverImage, SEOOverrides } from '../../server/content/types'

interface ContentMetaInput {
  description: string
  image: CoverImage
  kind: 'article' | 'website'
  seo: SEOOverrides
  title: string
}

type ContentMetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

export function createContentMeta({
  description: fallbackDescription,
  image: fallbackImage,
  kind,
  seo,
  title: fallbackTitle,
}: ContentMetaInput): ContentMetaDescriptor[] {
  const title = seo.title?.trim() || fallbackTitle
  const description = seo.description?.trim() || fallbackDescription
  const image = seo.image.url ? seo.image : fallbackImage
  const meta: ContentMetaDescriptor[] = [
    { title: `${title} — LAST//OS` },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: kind },
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

  return meta
}
