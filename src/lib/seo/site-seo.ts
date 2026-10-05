/**
 * Shared site-level SEO primitives.
 *
 * Route `head()` functions run on both the server and the client, so this
 * module must stay import-safe: no `src/server` imports (they are stripped
 * from the client graph) and no direct `Bun.env` reads. The canonical origin
 * is injected at build time by Vite (`define`) from `PUBLIC_SITE_URL`, with a
 * localhost fallback for dev.
 */

export const SITE_NAME = 'LAST//OS'

export const SITE_TAGLINE = 'Personal system online'

export const SITE_DESCRIPTION = 'A pixel-art personal operating system for ideas, projects, and conversations.'

/** Operator identity, reused by Person/ProfilePage structured data. */
export const SITE_AUTHOR = {
  name: 'Nelson',
  url: 'https://github.com/lst97',
  sameAs: ['https://github.com/lst97', 'https://wakatime.com/@lst97'],
} as const

/**
 * Default social card: a 1200x630 WebP committed at a stable URL. The source
 * artwork and publisher are `src/server/seo/og-artwork.webp` and
 * `scripts/assets/generate-og-image.ts`.
 */
export const SITE_OG_IMAGE_PATH = '/og/default.webp'

export const SITE_OG_IMAGE_RENDERER_PATH = '/api/site/og'
export const SITE_OG_IMAGE_RENDERER_VERSION = '3'

export const SITE_OG_IMAGE_TITLE_LIMIT = 120
export const SITE_OG_IMAGE_DESCRIPTION_LIMIT = 200

/** Pixel dimensions of the committed card; emitted as `og:image:width`/`height`. */
export const SITE_OG_IMAGE_WIDTH = 1200
export const SITE_OG_IMAGE_HEIGHT = 630

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
  /** Absolute or site-relative cover; otherwise a text card is rendered over the site artwork. */
  image?: string | null
  imageAlt?: string | null
  /** Intrinsic pixel size of `image`; omitted when the asset's size is unknown. */
  imageWidth?: number | null
  imageHeight?: number | null
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

export function createOgImagePath(title: string, description: string): string {
  const query = new URLSearchParams({
    title: clampDescription(title, SITE_OG_IMAGE_TITLE_LIMIT),
    description: clampDescription(description, SITE_OG_IMAGE_DESCRIPTION_LIMIT),
    v: SITE_OG_IMAGE_RENDERER_VERSION,
  })

  return `${SITE_OG_IMAGE_RENDERER_PATH}?${query.toString()}`
}

export function createOgImageAlt(title: string, description: string): string {
  return `LAST//OS share card for ${clampDescription(title, SITE_OG_IMAGE_TITLE_LIMIT)}. ${clampDescription(description, 150)}`
}

export function createPageMeta({
  description,
  image,
  imageAlt,
  imageHeight,
  imageWidth,
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
  const usesGeneratedImage = image === undefined || image === null
  const resolvedImage = absoluteUrl(image ?? createOgImagePath(title, pageDescription))
  const resolvedImageAlt =
    imageAlt ?? (usesGeneratedImage ? createOgImageAlt(title, pageDescription) : `${SITE_NAME} — ${SITE_TAGLINE}`)
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
    // Declared only for the committed default card, whose format this file
    // knows. A caller-supplied image's type is not recorded anywhere — Payload
    // stores no MIME — and guessing one from the extension would be wrong for
    // R2 media with query strings or no extension at all.
    if (usesGeneratedImage) meta.push({ property: 'og:image:type', content: 'image/webp' })
    // Only declare a size that is actually known: a wrong number is worse than
    // an absent tag, since a consumer sizes the card from these and a bad
    // aspect ratio crops the image. A caller-supplied image that declares no
    // size falls through and emits nothing.
    const width = usesGeneratedImage ? SITE_OG_IMAGE_WIDTH : imageWidth
    const height = usesGeneratedImage ? SITE_OG_IMAGE_HEIGHT : imageHeight
    if (width && height) {
      meta.push(
        { property: 'og:image:width', content: String(width) },
        { property: 'og:image:height', content: String(height) },
      )
    }
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
