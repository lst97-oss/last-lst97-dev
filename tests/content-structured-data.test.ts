import { describe, expect, it } from 'bun:test'

import { createContentMeta } from '../src/lib/content/meta'
import {
  createCollectionStructuredData,
  createPostStructuredData,
  createProjectStructuredData,
} from '../src/lib/content/structured-data'
import type { CoverImage, SEOOverrides } from '../src/server/content/types'

const noSeo: SEOOverrides = { title: null, description: null, image: { url: null, alt: null } }
const noImage: CoverImage = { url: null, alt: null }

function contentMeta(overrides: Partial<Parameters<typeof createContentMeta>[0]>) {
  return createContentMeta({
    description: 'An excerpt.',
    image: noImage,
    kind: 'article',
    pathname: '/blog/a-note',
    seo: noSeo,
    title: 'A note',
    ...overrides,
  })
}

function property(meta: ReturnType<typeof createContentMeta>, name: string) {
  return meta.meta.find(
    (entry): entry is { property: string; content: string } => 'property' in entry && entry.property === name,
  )?.content
}

function named(meta: ReturnType<typeof createContentMeta>, name: string) {
  return meta.meta.find((entry): entry is { name: string; content: string } => 'name' in entry && entry.name === name)
    ?.content
}

describe('content meta image handling', () => {
  it('emits an absolute og:image for a site-relative cover', () => {
    // A relative og:image is rejected by Facebook and X; this is the bug the
    // absolutisation fixes.
    const meta = contentMeta({ image: { url: '/media/cover.png', alt: 'Cover' } })

    expect(property(meta, 'og:image')).toBe('http://localhost:3000/media/cover.png')
    expect(named(meta, 'twitter:image')).toBe('http://localhost:3000/media/cover.png')
    expect(named(meta, 'twitter:card')).toBe('summary_large_image')
  })

  it('leaves an absolute media host untouched', () => {
    const meta = contentMeta({ image: { url: 'https://media.example.com/cover.png', alt: 'Cover' } })

    expect(property(meta, 'og:image')).toBe('https://media.example.com/cover.png')
  })

  it('falls back to a summary card when there is no image', () => {
    const meta = contentMeta({})

    expect(property(meta, 'og:image')).toBeUndefined()
    expect(named(meta, 'twitter:card')).toBe('summary')
  })
})

describe('content meta structured data', () => {
  it('emits a single escaped ld+json script', () => {
    const meta = contentMeta({ structuredData: { '@type': 'BlogPosting', headline: 'x' } })

    expect(meta.scripts).toHaveLength(1)
    expect(meta.scripts?.[0]?.type).toBe('application/ld+json')
    expect(JSON.parse(meta.scripts?.[0]?.children ?? '{}')).toMatchObject({ '@type': 'BlogPosting' })
  })

  it('escapes < so a value cannot close the script tag', () => {
    const meta = contentMeta({ structuredData: { headline: '</script><script>alert(1)</script>' } })

    expect(meta.scripts?.[0]?.children).not.toContain('</script>')
    expect(meta.scripts?.[0]?.children).toContain('\\u003c')
  })

  it('omits scripts entirely when no data is supplied', () => {
    expect(contentMeta({}).scripts).toBeUndefined()
  })
})

describe('post structured data', () => {
  it('describes a published note with its canonical url and dates', () => {
    const data = createPostStructuredData({
      title: 'Measuring layout',
      description: 'A grid that packs by measured height.',
      slug: 'measuring-layout',
      imageUrl: 'https://media.example.com/cover.png',
      publishedTime: '2026-09-20T00:00:00.000Z',
      modifiedTime: '2026-09-21T00:00:00.000Z',
      tags: ['css', 'grid'],
      readingTimeMinutes: 4.2,
    })

    expect(data['@type']).toBe('BlogPosting')
    expect(data.url).toContain('/blog/measuring-layout')
    expect(data.datePublished).toBe('2026-09-20T00:00:00.000Z')
    expect(data.dateModified).toBe('2026-09-21T00:00:00.000Z')
    expect(data.keywords).toBe('css, grid')
    expect(data.timeRequired).toBe('PT4M')
  })

  it('drops a non-http image rather than emitting invalid schema', () => {
    const data = createPostStructuredData({
      title: 'x',
      description: 'y',
      slug: 'x',
      imageUrl: 'javascript:alert(1)',
    })

    expect(data.image).toBeUndefined()
  })
})

describe('project structured data', () => {
  it('describes a project as an application with its links and languages', () => {
    const data = createProjectStructuredData({
      title: 'Cantonese Lyrics Studio',
      summary: 'Aligns lyrics to audio.',
      slug: 'cantonese-lyrics',
      liveUrl: 'https://demo.example.com',
      repositoryUrl: 'https://github.com/lst97/demo',
      technologies: ['TypeScript', 'Python'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    })

    expect(data['@type']).toBe('SoftwareApplication')
    expect(data.applicationCategory).toBe('DeveloperApplication')
    expect(data.codeRepository).toBe('https://github.com/lst97/demo')
    expect(data.programmingLanguage).toEqual(['TypeScript', 'Python'])
  })

  it('omits links that are absent or unsafe', () => {
    const data = createProjectStructuredData({
      title: 'x',
      summary: 'y',
      slug: 'x',
      liveUrl: 'javascript:alert(1)',
    })

    expect(data.potentialAction).toBeUndefined()
    expect(data.codeRepository).toBeUndefined()
  })
})

describe('collection structured data', () => {
  it('numbers items from one in render order', () => {
    const data = createCollectionStructuredData({
      pathname: '/blog',
      name: 'Blog',
      description: 'Notes.',
      items: [
        { name: 'Newest', slug: 'newest' },
        { name: 'Older', slug: 'older' },
      ],
    })
    const list = data.mainEntity as { '@type': string; itemListElement: Array<{ position: number; url: string }> }

    expect(data['@type']).toBe('CollectionPage')
    expect(list['@type']).toBe('ItemList')
    expect(list.itemListElement.map((entry) => entry.position)).toEqual([1, 2])
    expect(list.itemListElement[0]?.url).toContain('/blog/newest')
  })
})
