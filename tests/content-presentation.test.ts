import { describe, expect, test } from 'bun:test'

import { createContentMeta } from '../src/lib/content-meta'
import { formatPublishedDate } from '../src/lib/content-date'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '../src/lib/project-display'

describe('content presentation helpers', () => {
  test('prefers SEO overrides and falls back to editorial content and cover image', () => {
    expect(
      createContentMeta({
        title: 'Build notes',
        description: 'A post excerpt.',
        image: { url: '/media/cover.png', alt: 'Cover art' },
        seo: {
          title: 'SEO title',
          description: 'SEO description.',
          image: { url: '/media/social.png', alt: 'Social art' },
        },
        kind: 'article',
      }),
    ).toEqual([
      { title: 'SEO title — LAST//OS' },
      { name: 'description', content: 'SEO description.' },
      { property: 'og:title', content: 'SEO title' },
      { property: 'og:description', content: 'SEO description.' },
      { property: 'og:type', content: 'article' },
      { property: 'og:image', content: '/media/social.png' },
      { property: 'og:image:alt', content: 'Social art' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'SEO title' },
      { name: 'twitter:description', content: 'SEO description.' },
      { name: 'twitter:image', content: '/media/social.png' },
      { name: 'twitter:image:alt', content: 'Social art' },
    ])

    expect(
      createContentMeta({
        title: 'Project title',
        description: 'Project summary.',
        image: { url: '/media/project.png', alt: 'Project preview' },
        seo: { title: null, description: null, image: { url: null, alt: null } },
        kind: 'website',
      }),
    ).toContainEqual({ property: 'og:image', content: '/media/project.png' })
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
