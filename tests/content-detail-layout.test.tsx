import { describe, expect, test } from 'bun:test'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ContentDetailLayout } from '../src/components/site/content/detail-layout'

async function render(element: ReturnType<typeof createElement>) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

describe('content detail layout', () => {
  test('renders a shared note detail layout with cover, tags, and content', async () => {
    const markup = await render(
      createElement(ContentDetailLayout, {
        windowTitle: 'note://small-tools',
        icon: '✎',
        backHref: '/blog',
        backLabel: '← BACK TO NOTES',
        eyebrow: 'NOTE / 20 SEP 2026',
        coverImage: { url: '/media/note.png', alt: 'Note cover' },
        title: 'Small tools',
        excerpt: 'A note about useful software.',
        tags: ['build logs'],
        children: createElement('p', null, 'Article body.'),
      }),
    )

    expect(markup).toContain('note://small-tools')
    expect(markup).toContain('← BACK TO NOTES')
    expect(markup).toContain('src="/media/note.png"')
    expect(markup).toContain('NOTE / 20 SEP 2026')
    expect(markup).toContain('build logs')
    expect(markup).toContain('<p>Article body.</p>')
  })

  test('renders changelog versions through the same eyebrow slot', async () => {
    const markup = await render(
      createElement(ContentDetailLayout, {
        windowTitle: 'changelog://4.2',
        icon: '↻',
        backHref: '/changelog',
        backLabel: '← BACK TO CHANGELOG',
        eyebrow: 'CHANGELOG / 20 SEP 2026 / 4.2',
        coverImage: { url: null, alt: null },
        title: 'Release 4.2',
        excerpt: 'A release note.',
        tags: [],
        children: createElement('p', null, 'Release body.'),
      }),
    )

    expect(markup).toContain('← BACK TO CHANGELOG')
    expect(markup).toContain('CHANGELOG / 20 SEP 2026 / 4.2')
    expect(markup).toContain('Release 4.2')
  })

  test('gives each byline field its own icon', async () => {
    // `created` is derived, not passed: a document with a publishedAt shows
    // PUBLISHED and suppresses CREATED, and only an undated one shows CREATED.
    // Both shapes are covered so every icon is exercised.
    const published = await render(
      createElement(ContentDetailLayout, {
        windowTitle: 'note://dated',
        icon: '✎',
        backHref: '/blog',
        backLabel: '← BACK TO NOTES',
        eyebrow: 'NOTE',
        coverImage: { url: null, alt: null },
        title: 'Dated note',
        excerpt: 'A note with a full byline.',
        tags: [],
        publishedAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-03-04T00:00:00.000Z',
        readingTime: '4 MIN READ',
        children: createElement('p', null, 'Body.'),
      }),
    )

    const undated = await render(
      createElement(ContentDetailLayout, {
        windowTitle: 'note://undated',
        icon: '✎',
        backHref: '/blog',
        backLabel: '← BACK TO NOTES',
        eyebrow: 'NOTE',
        coverImage: { url: null, alt: null },
        title: 'Undated note',
        excerpt: 'A note with a creation date only.',
        tags: [],
        updatedAt: '2026-03-04T00:00:00.000Z',
        children: createElement('p', null, 'Body.'),
      }),
    )

    // Icon and label are one unit, so a byline field that renders without its
    // icon reads as a floating fragment. lucide stamps a `lucide-<name>` class
    // on every icon, so that is what identifies each one; the label proves the
    // icon is bound to the right field rather than merely present somewhere.
    expect(published).toMatch(/lucide-calendar-days[\s\S]*?<\/svg><span>PUBLISHED/)
    expect(undated).toMatch(/lucide-plus[\s\S]*?<\/svg><span>CREATED/)
    expect(published).toMatch(/lucide-rotate-ccw-clock[\s\S]*?<\/svg><span>UPDATED/)
    expect(published).toMatch(/lucide-clock-3[\s\S]*?<\/svg><span>READ/)
    expect(published).toContain('4 MIN READ')
  })

  test('omits the byline entirely when no field has a value', async () => {
    const markup = await render(
      createElement(ContentDetailLayout, {
        windowTitle: 'note://undated',
        icon: '✎',
        backHref: '/blog',
        backLabel: '← BACK TO NOTES',
        eyebrow: 'NOTE',
        coverImage: { url: null, alt: null },
        title: 'Undated note',
        excerpt: 'No dates at all.',
        tags: [],
        children: createElement('p', null, 'Body.'),
      }),
    )

    expect(markup).not.toContain('detail-meta')
  })
})
