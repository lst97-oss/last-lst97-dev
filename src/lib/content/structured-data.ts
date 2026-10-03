/**
 * JSON-LD builders for the CMS-backed pages.
 *
 * `createContentMeta` already assembles the meta/link set; this module supplies
 * the structured data so a detail page can be understood as a post or an
 * application rather than as a generic page, and so an archive can advertise
 * its ordered membership.
 */

import { canonicalUrl, SITE_AUTHOR, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site-seo'
import {
  SERVICE_OVERVIEW,
  SERVICE_PACKAGE_PRICE_AMOUNT,
  SERVICE_PACKAGES,
  SERVICE_SECTION_HEADING,
  SERVICE_SUPPORT_OVERVIEW,
  SERVICE_SUPPORT_PLANS,
  SERVICE_SUPPORT_SECTION_HEADING,
  SUPPORT_TIER_PRICE_AMOUNT,
} from '@/lib/services/packages'

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
    ...(schemaUrl(input.liveUrl)
      ? { potentialAction: { '@type': 'ViewAction', target: schemaUrl(input.liveUrl) } }
      : {}),
    dateCreated: input.createdAt ?? undefined,
    ...(input.updatedAt ? { dateModified: input.updatedAt } : {}),
  }
}

export interface ChangelogStructuredDataInput {
  title: string
  summary: string
  slug: string
  /** Release version, e.g. `v1.3.0`. Omitted from the schema when null. */
  version?: string | null
  imageUrl?: string | null
  publishedTime?: string | null
  modifiedTime?: string | null
  tags?: readonly string[]
}

/**
 * `SoftwareApplication` for a shipped release. A release is a versioned copy
 * of the site itself, so the category is `WebApplication` — not the project
 * builder's `DeveloperApplication`, which describes the React/TypeScript tools
 * in `/projects`.
 */
export function createChangelogStructuredData(input: ChangelogStructuredDataInput): Record<string, unknown> {
  const url = canonicalUrl(`/changelog/${input.slug}`)
  const image = schemaUrl(input.imageUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.title,
    description: input.summary,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    applicationCategory: 'WebApplication',
    operatingSystem: 'Any',
    ...(input.version ? { softwareVersion: input.version } : {}),
    ...(image ? { image } : {}),
    ...(input.publishedTime ? { datePublished: input.publishedTime } : {}),
    ...(input.modifiedTime ? { dateModified: input.modifiedTime } : {}),
    ...(input.tags?.length ? { keywords: input.tags.join(', ') } : {}),
    author: AUTHOR_NODE,
    publisher: { '@type': 'Organization', name: SITE_NAME, slogan: SITE_TAGLINE },
    isPartOf: { '@type': 'WebSite', name: SITE_NAME },
    mainEntity: { '@type': 'WebPage', '@id': canonicalUrl('/changelog') },
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

export interface BreadcrumbCrumb {
  /** Human-readable label, e.g. `Blog` or `Shipping small tools`. */
  name: string
  /** Site-relative path, e.g. `/blog` or `/blog/shipping-small-tools`. */
  path: string
}

/**
 * `BreadcrumbList` for a page nested below the root. Positions are 1-based,
 * matching `createCollectionStructuredData`. The final crumb carries no `item`
 * URL: it is the current page, and a consumer that resolves the trail would
 * otherwise be sent to a second URL describing the page it is already on.
 */
export function createBreadcrumbStructuredData(crumbs: readonly BreadcrumbCrumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(index < crumbs.length - 1 ? { item: canonicalUrl(crumb.path) } : {}),
    })),
  }
}

/**
 * Merges a page entity and its breadcrumb trail into one `@graph` so a single
 * ld+json script carries both. `createContentMeta` accepts one
 * `structuredData` value and emits one script, so a detail page cannot hand it
 * a second one.
 */
/**
 * `entity` accepts one node or several: a page that publishes more than one
 * entity (e.g. two Service nodes) still has to emit a single ld+json script, so
 * the extra nodes join the same graph instead of a second script.
 */
export function withBreadcrumbs(
  entity: Record<string, unknown> | Record<string, unknown>[],
  crumbs: readonly BreadcrumbCrumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [...(Array.isArray(entity) ? entity : [entity]), createBreadcrumbStructuredData(crumbs)],
  }
}

/**
 * `Service` + `OfferCatalog` for /services, carrying the three priced packages
 * so search engines can read the price without scraping the rendered card.
 * `price` must be a number, so the amounts come from
 * `SERVICE_PACKAGE_PRICE_AMOUNT` rather than being parsed out of the display
 * label, and the entity is merged with its breadcrumb trail through
 * `withBreadcrumbs` because `createPageMeta` emits a single ld+json script.
 */
/**
 * The Go Support Plan is a second Service node rather than extra offers on the
 * build catalog: its entry point is an hourly rate, and a bare numeric `price`
 * on the build catalog would tell crawlers the consultation costs A$40 once.
 * `unitText: 'HOUR'` is the schema.org mechanism that marks a rate. The
 * "Custom Quote" row has no figure and is omitted rather than emitted as A$0,
 * which would advertise the work as free.
 */
export function createServicesStructuredData(): Record<string, unknown> {
  const url = canonicalUrl('/services')
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
  ] as const

  return withBreadcrumbs(
    [
      {
        '@type': 'Service',
        name: 'Website Design & Development',
        serviceType: 'Website design and development',
        description: SERVICE_OVERVIEW,
        url,
        areaServed: 'AU',
        provider: AUTHOR_NODE,
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: SERVICE_SECTION_HEADING,
          itemListElement: SERVICE_PACKAGES.map((pkg) => ({
            '@type': 'Offer',
            name: pkg.name,
            description: pkg.tagline,
            price: SERVICE_PACKAGE_PRICE_AMOUNT[pkg.slug],
            priceCurrency: 'AUD',
            url,
          })),
        },
      },
      {
        '@type': 'Service',
        name: SERVICE_SUPPORT_SECTION_HEADING,
        serviceType: 'Technical support for existing websites and web applications',
        description: SERVICE_SUPPORT_OVERVIEW,
        url,
        areaServed: 'AU',
        provider: AUTHOR_NODE,
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `${SERVICE_SUPPORT_SECTION_HEADING} — starting prices`,
          itemListElement: SERVICE_SUPPORT_PLANS.flatMap((plan) => {
            const price = SUPPORT_TIER_PRICE_AMOUNT[plan.slug]
            if (price === undefined) return []
            return [
              {
                '@type': 'Offer' as const,
                name: plan.name,
                description: plan.bestFor,
                price,
                priceCurrency: 'AUD',
                url,
                ...(plan.price.includes('/ hour') ? { unitText: 'HOUR' } : {}),
              },
            ]
          }),
        },
      },
    ],
    crumbs,
  )
}
