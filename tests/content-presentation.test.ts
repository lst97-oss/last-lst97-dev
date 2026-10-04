import { describe, expect, test } from 'bun:test'
import { formatPublishedDate } from '../src/lib/content/date'
import { createContentMeta, resolveContentShare } from '../src/lib/content/meta'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '../src/lib/content/project-display'
import { getSiteUrl, SITE_OG_IMAGE_PATH } from '../src/lib/seo/site-seo'

describe('content presentation helpers', () => {
  test('prefers SEO overrides and falls back to editorial content and cover image', () => {
    const overridden = createContentMeta({
      title: 'Build notes',
      description: 'A post excerpt.',
      image: { url: '/media/cover.png', alt: 'Cover art' },
      seo: {
        title: 'SEO title',
        description: 'SEO description.',
        image: { url: '/media/social.png', alt: 'Social art' },
      },
      kind: 'article',
      pathname: '/blog/build-notes',
      publishedTime: '2026-09-20T00:00:00.000Z',
      tags: ['react', 'css'],
    })

    expect(overridden.meta).toEqual([
      { title: 'SEO title — LAST//OS' },
      { name: 'description', content: 'SEO description.' },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { property: 'og:title', content: 'SEO title' },
      { property: 'og:description', content: 'SEO description.' },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: `${getSiteUrl()}/blog/build-notes` },
      { property: 'og:site_name', content: 'LAST//OS' },
      { property: 'og:image', content: `${getSiteUrl()}/media/social.png` },
      { property: 'og:image:alt', content: 'Social art' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'SEO title' },
      { name: 'twitter:description', content: 'SEO description.' },
      { name: 'twitter:image', content: `${getSiteUrl()}/media/social.png` },
      { name: 'twitter:image:alt', content: 'Social art' },
      { property: 'article:published_time', content: '2026-09-20T00:00:00.000Z' },
      { property: 'article:tag', content: 'react' },
      { property: 'article:tag', content: 'css' },
    ])

    // The canonical must match the public pathname, not the internal route id,
    // so query-string duplicates collapse onto one URL.
    expect(overridden.links).toEqual([{ rel: 'canonical', href: `${getSiteUrl()}/blog/build-notes` }])

    const fallback = createContentMeta({
      title: 'Project title',
      description: 'Project summary.',
      image: { url: '/media/project.png', alt: 'Project preview' },
      seo: { title: null, description: null, image: { url: null, alt: null } },
      kind: 'website',
      pathname: '/projects/project-title',
    })

    expect(fallback.meta).toContainEqual({ property: 'og:image', content: `${getSiteUrl()}/media/project.png` })
    // Website pages carry no article dates or tags even when supplied.
    expect(fallback.meta.some((entry) => 'property' in entry && entry.property?.startsWith('article:'))).toBe(false)
  })

  test('resolves share values to exactly what the head emits', () => {
    const share = resolveContentShare({
      title: 'Build notes',
      description: 'A post excerpt.',
      image: { url: '/media/cover.png', alt: 'Cover art' },
      seo: {
        title: '  SEO title  ',
        description: 'SEO description.',
        image: { url: '/media/social.png', alt: 'Social art' },
      },
      pathname: '/blog/build-notes',
    })

    // Same precedence as `createContentMeta`: overrides win and are trimmed,
    // and the URL is the canonical one rather than the internal route id.
    expect(share.title).toBe('SEO title')
    expect(share.description).toBe('SEO description.')
    expect(share.url).toBe(`${getSiteUrl()}/blog/build-notes`)
    expect(share.image).toEqual({
      url: `${getSiteUrl()}/media/social.png`,
      alt: 'Social art',
      width: 0,
      height: 0,
      isDefault: false,
    })

    // An empty override falls through to the editorial fields and the cover.
    const fallback = resolveContentShare({
      title: 'Project title',
      description: 'Project summary.',
      image: { url: '/media/project.png', alt: 'Project preview' },
      seo: { title: '   ', description: null, image: { url: null, alt: null } },
      pathname: '/projects/project-title',
    })

    expect(fallback.title).toBe('Project title')
    expect(fallback.description).toBe('Project summary.')
    expect(fallback.image.url).toBe(`${getSiteUrl()}/media/project.png`)
  })

  test('previews the hero derivative, and falls back to the site card when there is no cover', () => {
    // Scrapers fetch og:image on every crawl, so the preview must show the
    // bounded derivative the head emits rather than the full-size original.
    const hero = resolveContentShare({
      title: 'Release 4.2',
      description: 'Changelog entry.',
      image: {
        url: '/media/entry.png',
        alt: 'Entry art',
        width: 2400,
        height: 1600,
        sizes: { hero: { url: '/media/entry-1600.webp', width: 1600, height: 900 } },
      },
      seo: { title: null, description: null, image: { url: null, alt: null } },
      pathname: '/changelog/release-4-2',
    })

    expect(hero.image).toEqual({
      url: `${getSiteUrl()}/media/entry-1600.webp`,
      alt: 'Entry art',
      width: 1600,
      height: 900,
      isDefault: false,
    })

    // No cover and no override falls back to the committed site card rather
    // than emitting no image: without `og:image` a link unfurl degrades to a
    // bare text stub, and most documents here carry no cover.
    const imageless = resolveContentShare({
      title: 'Untitled note',
      description: 'No cover on this one.',
      image: { url: null, alt: null },
      seo: { title: null, description: null, image: { url: null, alt: null } },
      pathname: '/blog/untitled-note',
    })

    expect(imageless.image).toEqual({
      url: `${getSiteUrl()}${SITE_OG_IMAGE_PATH}`,
      alt: 'LAST//OS — Personal system online',
      width: 1200,
      height: 630,
      isDefault: true,
    })

    // `isDefault` is what lets the share preview label the card honestly
    // instead of passing the site card off as the document's own artwork.
    const meta = createContentMeta({
      title: 'Untitled note',
      description: 'No cover on this one.',
      image: { url: null, alt: null },
      seo: { title: null, description: null, image: { url: null, alt: null } },
      kind: 'article',
      pathname: '/blog/untitled-note',
    })

    expect(meta.meta).toContainEqual({ property: 'og:image', content: `${getSiteUrl()}${SITE_OG_IMAGE_PATH}` })
    expect(meta.meta).toContainEqual({ property: 'og:image:type', content: 'image/webp' })
    expect(meta.meta).toContainEqual({ property: 'og:image:width', content: '1200' })
    expect(meta.meta).toContainEqual({ property: 'og:image:height', content: '630' })
    // With an image always present, the small-card fallback is dead: X is told
    // to render the large card even when the image is the generic site one.
    expect(meta.meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })

  test('formats project lifecycle and year-only ranges', () => {
    expect(getProjectLifecycleLabel('in_progress')).toBe('IN PROGRESS')
    expect(formatProjectTimeframe('in_progress', '2025-03-01', null)).toBe('2025–PRESENT')
    expect(formatProjectTimeframe('completed', '2021-03-01', '2024-08-01')).toBe('2021–2024')
    expect(formatProjectTimeframe('planned', null, null)).toBeNull()
    expect(formatProjectTimeframe('completed', 'not-a-date', null)).toBeNull()
  })

  test('formats published dates in Melbourne time independent of the runtime timezone', () => {
    expect(formatPublishedDate('2026-09-20T13:59:59.000Z')).toBe('20/09/2026')
    expect(formatPublishedDate('2026-09-20T14:00:00.000Z')).toBe('21/09/2026')
  })
})
