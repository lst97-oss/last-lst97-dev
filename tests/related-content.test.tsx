import { describe, expect, test } from 'bun:test'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChangelogNeighbours } from '../src/components/site/content/changelog-neighbours'
import { RelatedContent } from '../src/components/site/content/related-content'
import type { ChangelogSummary, PostSummary, ProjectSummary } from '../src/server/content/types'

function render(element: ReturnType<typeof createElement>) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  return router.load().then(() => renderToStaticMarkup(createElement(RouterProvider, { router })))
}

const project = (slug: string): ProjectSummary => ({
  slug,
  title: `Project ${slug}`,
  summary: 'A summary.',
  technologies: ['TypeScript'],
  topics: [],
  tags: [],
  gallery: [],
  featured: false,
  coverImage: { url: null, alt: null },
  updatedAt: '2026-01-01T00:00:00.000Z',
  role: null,
  projectStatus: null,
  startDate: null,
  endDate: null,
})

const post = (slug: string): PostSummary => ({
  slug,
  title: `Note ${slug}`,
  excerpt: 'An excerpt.',
  publishedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  coverImage: { url: null, alt: null },
})

const entry = (slug: string): ChangelogSummary => ({
  slug,
  title: `Release ${slug}`,
  version: 'v1.0.0',
  excerpt: 'What changed.',
  publishedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  changeTypes: ['feature'],
  coverImage: { url: null, alt: null },
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('RelatedContent', () => {
  test('renders nothing at all when there is nothing related', async () => {
    const markup = await render(createElement(RelatedContent, { items: [], kind: 'project' }))

    // An empty "you may also want to know" heading would promise onward reading
    // the page cannot offer.
    expect(markup).toBe('')
  })

  test('links each related project to its own detail page', async () => {
    const markup = await render(
      createElement(RelatedContent, { items: [project('alpha'), project('beta')], kind: 'project' }),
    )

    expect(markup).toContain('YOU MAY ALSO WANT TO KNOW')
    expect(markup).toContain('Related projects.')
    expect(markup).toContain('/projects/alpha')
    expect(markup).toContain('/projects/beta')
    expect(markup).not.toContain('/blog/')
  })

  test('links each related note to the blog, never to a project', async () => {
    const markup = await render(createElement(RelatedContent, { items: [post('one'), post('two')], kind: 'post' }))

    expect(markup).toContain('Related notes.')
    expect(markup).toContain('/blog/one')
    expect(markup).toContain('/blog/two')
    expect(markup).not.toContain('/projects/')
  })
})

describe('ChangelogNeighbours', () => {
  test('renders both neighbours in release order', async () => {
    const markup = await render(createElement(ChangelogNeighbours, { previous: entry('older'), next: entry('newer') }))

    expect(markup).toContain('KEEP READING')
    expect(markup).toContain('Other releases.')
    expect(markup).toContain('/changelog/older')
    expect(markup).toContain('/changelog/newer')
  })

  test('keeps the missing neighbour column empty rather than dropping the row', async () => {
    const markup = await render(createElement(ChangelogNeighbours, { previous: null, next: entry('newer') }))

    expect(markup).toContain('/changelog/newer')
    expect(markup).toContain('Oldest release')
  })

  test('renders nothing when the entry is alone in the archive', async () => {
    const markup = await render(createElement(ChangelogNeighbours, { previous: null, next: null }))

    expect(markup).toBe('')
  })
})
