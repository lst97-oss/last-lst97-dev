/**
 * Shared site-level SEO primitives.
 *
 * Route `head()` functions run on both the server and the client, so this
 * module must stay import-safe: no `src/server` imports (they are stripped
 * from the client graph) and no direct `Bun.env` reads. The canonical origin
 * is injected at build time by Vite (`define`) from `PUBLIC_SITE_URL`, with a
 * localhost fallback for dev.
 *
 * Every route composes its head from `createPageMeta` so titles, canonicals,
 * and social tags stay consistent instead of being re-invented per page.
 */

export const SITE_NAME = 'LAST//OS'

export const SITE_TAGLINE = 'Personal system online'

export const SITE_DESCRIPTION =
  'A pixel-art personal operating system for ideas, projects, and conversations.'

/** Operator identity, reused by Person/ProfilePage structured data. */
export const SITE_AUTHOR = {
  name: 'Nelson',
  url: 'https://github.com/lst97',
  sameAs: ['https://github.com/lst97', 'https://wakatime.com/@lst97'],
} as const

/** Absolute path to the icon reused as the default social card image. */
export const SITE_ICON_PATH = '/favicon/favicon.svg'

/**
 * Vite's `define` only substitutes *bare identifier* references, so this is
 * declared as a value (not a string key looked up on `globalThis`, which the
 * replacement silently skipped). `__LAST_OS_SITE_URL__` is injected from
 * `PUBLIC_SITE_URL` in vite.config.ts; `typeof` guards the raw Node/tsx run
 * where no `define` pass happens.
 */
declare const __LAST_OS_SITE_URL__: string | undefined

const FALLBACK_SITE_URL = 'http://localhost:3000'

/** Canonical origin with no trailing slash. */
export function getSiteUrl(): string {
  const candidate = typeof __LAST_OS_SITE_URL__ === 'string' ? __LAST_OS_SITE_URL__.trim() : ''
  const base = candidate && isAbsoluteUrl(candidate) ? candidate : FALLBACK_SITE_URL
  return base.replace(/\/+$/, '')
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Resolves a site-relative or already-absolute path to an absolute URL.
 * Absolute inputs (R2 media, external links) are returned untouched so
 * Payload-hosted images are never rewritten against the site origin.
 */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const value = path.trim()
  if (!value) return null
  if (isAbsoluteUrl(value)) return value
  return `${getSiteUrl()}/${value.replace(/^\/+/, '')}`
}

/**
 * `/_site/...` and `/$slug`-style route paths are internal route ids, not
 * public paths. Routes pass their public pathname explicitly instead.
 */
export function canonicalUrl(pathname: string): string {
  const [rawPath = '/', query] = pathname.split('?')
  const trimmed = rawPath.replace(/^\/+/, '').replace(/\/+$/, '')
  // The root canonical keeps its trailing slash: `https://host` and
  // `https://host/` are the same URL, and stripping it would make the root
  // canonical differ from the sitemap entry, splitting ranking signals.
  const base = trimmed ? `${getSiteUrl()}/${trimmed}` : `${getSiteUrl()}/`
  return query ? `${base}?${query}` : base
}

// `@tanstack/react-router` narrows `head().meta` to plain React `<meta>`
// props, so structured data goes in `head().scripts`, which is typed as
// `<script>` props. The router renders its `children` as raw text, so the
// JSON-LD is serialised here; `<` is escaped so no value can close the tag.
export type MetaDescriptor = React.JSX.IntrinsicElements['meta']

export type ScriptDescriptor = React.JSX.IntrinsicElements['script']

export interface PageMetaInput {
  /** Public pathname, e.g. `/blog/a-post`. Used for canonical + og:url. */
  pathname: string
  title: string
  description: string
  /** Absolute or site-relative image; falls back to the site icon. */
  image?: string | null
  imageAlt?: string | null
  type?: 'website' | 'article' | 'profile'
  /** Defaults to indexable. Set for pages that must not be crawled. */
  noindex?: boolean
  /** ISO date for `article:published_time` on article pages. */
  publishedTime?: string | null
  /** ISO date for `article:modified_time` on article pages. */
  modifiedTime?: string | null
  tags?: readonly string[]
  /**
   * Page-specific JSON-LD graph node, e.g. ProfilePage on /about. Rendered as
   * `<script type="application/ld+json">` in the document head.
   */
  structuredData?: Record<string, unknown>
}

export interface PageMeta {
  meta: MetaDescriptor[]
  links: { rel: string; href: string }[]
  scripts: ScriptDescriptor[]
}

const MAX_DESCRIPTION_LENGTH = 200

/**
 * Trims descriptions to the length search engines actually display. Cuts on
 * a word boundary so we never emit a half-word mid-snippet.
 */
export function clampDescription(value: string, max = MAX_DESCRIPTION_LENGTH): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  const clipped = normalized.slice(0, max)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s.,;:—-]+$/, '')}…`
}

/**
 * Builds the full meta/link/script set for a page: title, description,
 * canonical, Open Graph, Twitter card, and optional article metadata.
 */
export function createPageMeta({
  description,
  image,
  imageAlt,
  modifiedTime,
  noindex = false,
  pathname,
  publishedTime,
  structuredData,
  tags,
  title,
  type = 'website',
}: PageMetaInput): PageMeta {
  const pageTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
  const pageDescription = clampDescription(description)
  const canonical = canonicalUrl(pathname)
  const resolvedImage = absoluteUrl(image ?? SITE_ICON_PATH)
  const resolvedImageAlt = imageAlt ?? `${SITE_NAME} — ${SITE_TAGLINE}`
  const isArticle = type === 'article'

  const meta: MetaDescriptor[] = [
    { title: pageTitle },
    { name: 'description', content: pageDescription },
    { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: pageDescription },
    { property: 'og:url', content: canonical },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'en' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: pageDescription },
  ]

  if (resolvedImage) {
    meta.push(
      { property: 'og:image', content: resolvedImage },
      { property: 'og:image:alt', content: resolvedImageAlt },
      { name: 'twitter:image', content: resolvedImage },
      { name: 'twitter:image:alt', content: resolvedImageAlt },
    )
  }

  if (isArticle) {
    if (publishedTime) meta.push({ property: 'article:published_time', content: publishedTime })
    if (modifiedTime) meta.push({ property: 'article:modified_time', content: modifiedTime })
    for (const tag of tags ?? []) meta.push({ property: 'article:tag', content: tag })
  }

  return {
    meta,
    links: [{ rel: 'canonical', href: canonical }],
    scripts:
      structuredData === undefined
        ? []
        : [{ type: 'application/ld+json', children: JSON.stringify(structuredData).replace(/</g, '\\u003c') }],
  }
}

/** Site-wide structured data, emitted once from the root route. */
export function createSiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${getSiteUrl()}/#website`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: `${getSiteUrl()}/`,
        inLanguage: 'en',
        publisher: { '@id': `${getSiteUrl()}/#person` },
      },
      {
        '@type': 'Person',
        '@id': `${getSiteUrl()}/#person`,
        name: SITE_AUTHOR.name,
        url: SITE_AUTHOR.url,
        sameAs: [...SITE_AUTHOR.sameAs],
      },
    ],
  }
}
