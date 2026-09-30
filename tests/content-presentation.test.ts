import { describe, expect, test } from 'bun:test'

import { createContentMeta } from '../src/lib/content/meta'
import { formatPublishedDate } from '../src/lib/content/date'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '../src/lib/content/project-display'
import { getSiteUrl } from '../src/lib/seo/site-seo'

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
    expect(overridden.links).toEqual([
      { rel: 'canonical', href: `${getSiteUrl()}/blog/build-notes` },
    ])

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
  test('formats project lifecycle and year-only ranges', () => {
    expect(getProjectLifecycleLabel('in_progress')).toBe('IN PROGRESS')
    expect(formatProjectTimeframe('in_progress', '2025-03-01', null)).toBe('2025–PRESENT')
    expect(formatProjectTimeframe('completed', '2021-03-01', '2024-08-01')).toBe('2021–2024')
    expect(formatProjectTimeframe('planned', null, null)).toBeNull()
    expect(formatProjectTimeframe('completed', 'not-a-date', null)).toBeNull()
  })

  test('formats published dates in Melbourne time independent of the runtime timezone', () => {
    expect(formatPublishedDate('2026-09-20T13:59:59.000Z')).toBe('20/9/2026')
    expect(formatPublishedDate('2026-09-20T14:00:00.000Z')).toBe('21/9/2026')
  })
})
