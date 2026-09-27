import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'

import { ContentDetailLayout } from '../src/components/site/content/detail-layout'

async function render(element: ReturnType<typeof createElement>) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

describe('content detail layout', () => {
  test('renders a shared note detail layout with cover, tags, and content', async () => {
    const markup = await render(createElement(ContentDetailLayout, {
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
    }))

    expect(markup).toContain('note://small-tools')
    expect(markup).toContain('← BACK TO NOTES')
    expect(markup).toContain('src="/media/note.png"')
    expect(markup).toContain('NOTE / 20 SEP 2026')
    expect(markup).toContain('build logs')
    expect(markup).toContain('<p>Article body.</p>')
  })

  test('renders changelog versions through the same eyebrow slot', async () => {
    const markup = await render(createElement(ContentDetailLayout, {
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
    }))

    expect(markup).toContain('← BACK TO CHANGELOG')
    expect(markup).toContain('CHANGELOG / 20 SEP 2026 / 4.2')
    expect(markup).toContain('Release 4.2')
  })
})
