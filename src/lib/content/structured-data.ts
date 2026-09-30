/**
 * JSON-LD builders for the CMS-backed pages.
 *
 * `createContentMeta` already assembles the meta/link set; this module supplies
 * the structured data so a detail page can be understood as a post or an
 * application rather than as a generic page, and so an archive can advertise
 * its ordered membership.
 */

import { canonicalUrl, SITE_AUTHOR, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site-seo'

/** Only http(s) URLs are emitted; anything else would be invalid schema. */
function schemaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}

const AUTHOR_NODE = {
  '@type': 'Person',
  name: SITE_AUTHOR.name,
  url: SITE_AUTHOR.url,
  sameAs: [...SITE_AUTHOR.sameAs],
}

export interface PostStructuredDataInput {
  title: string
  description: string
  slug: string
  /** Absolute cover image URL; omitted when the record has no cover. */
  imageUrl?: string | null
  publishedTime?: string | null
  modifiedTime?: string | null
  tags?: readonly string[]
  readingTimeMinutes?: number | null
}

/** `BlogPosting` for a published note. */
export function createPostStructuredData(input: PostStructuredDataInput): Record<string, unknown> {
  const url = canonicalUrl(`/blog/${input.slug}`)
  const image = schemaUrl(input.imageUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(image ? { image } : {}),
    datePublished: input.publishedTime ?? undefined,
    ...(input.modifiedTime ? { dateModified: input.modifiedTime } : {}),
    ...(input.readingTimeMinutes ? { timeRequired: `PT${Math.max(1, Math.round(input.readingTimeMinutes))}M` } : {}),
    ...(input.tags?.length ? { keywords: input.tags.join(', ') } : {}),
    author: AUTHOR_NODE,
    publisher: { '@type': 'Organization', name: SITE_NAME, slogan: SITE_TAGLINE },
    isPartOf: { '@type': 'WebSite', name: SITE_NAME },
    mainEntity: { '@type': 'WebPage', '@id': canonicalUrl('/blog') },
  }
}

export interface ProjectStructuredDataInput {
  title: string
  summary: string
  slug: string
  imageUrl?: string | null
  liveUrl?: string | null
  repositoryUrl?: string | null
  technologies?: readonly string[]
  createdAt?: string | null
  updatedAt?: string | null
}

/**
 * `SoftwareApplication` for a shipped project. `applicationCategory` follows
 * Google's documented value "DeveloperApplication" for developer tools, which
 * is the closest fit for the React/TypeScript work in this portfolio.
 */
export function createProjectStructuredData(input: ProjectStructuredDataInput): Record<string, unknown> {
  const url = canonicalUrl(`/projects/${input.slug}`)
  const image = schemaUrl(input.imageUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.title,
    description: input.summary,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    ...(image ? { image } : {}),
    ...(input.technologies?.length ? { programmingLanguage: [...input.technologies] } : {}),
    author: AUTHOR_NODE,
    ...(schemaUrl(input.repositoryUrl) ? { codeRepository: schemaUrl(input.repositoryUrl) } : {}),
    ...(schemaUrl(input.liveUrl) ? { potentialAction: { '@type': 'ViewAction', target: schemaUrl(input.liveUrl) } } : {}),
    dateCreated: input.createdAt ?? undefined,
    ...(input.updatedAt ? { dateModified: input.updatedAt } : {}),
  }
}

export interface CollectionItem {
  name: string
  slug: string
}

export interface CollectionStructuredDataInput {
  /** Public pathname of the archive, e.g. `/blog`. */
  pathname: string
  name: string
  description: string
  items: readonly CollectionItem[]
}

/**
 * `CollectionPage` wrapping an `ItemList`. The list position is 1-based and
 * follows the order the page renders, which is newest-first for both archives.
 */
export function createCollectionStructuredData(input: CollectionStructuredDataInput): Record<string, unknown> {
  const url = canonicalUrl(input.pathname)
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: canonicalUrl(`${input.pathname}/${item.slug}`),
      })),
    },
  }
}
