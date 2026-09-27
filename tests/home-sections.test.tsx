import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'

import { HomeFeaturedProjectSection } from '../src/components/site/home/featured-project-section'
import { HomeHeroSection } from '../src/components/site/home/hero-section'
import { HomeOperatorProfileSection } from '../src/components/site/home/operator-profile-section'
import { HomeRecentNotesSection } from '../src/components/site/home/recent-notes-section'

async function render(element: ReturnType<typeof createElement>) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

describe('home sections', () => {
  test('keeps the welcome content and profile details together', async () => {
    const markup = await render(createElement(HomeHeroSection))

    expect(markup).toContain('SYSTEM MESSAGE / 001')
    expect(markup).toContain('Open-source builder focused on useful tools.')
    expect(markup).toContain('CURRENT FOCUS')
  })

  test('shows the existing empty state when there is no featured project', async () => {
    const markup = await render(createElement(HomeFeaturedProjectSection, { project: undefined }))

    expect(markup).toContain('Project archive is ready for its first upload.')
    expect(markup).toContain('START A CONVERSATION')
  })

  test('shows the operator profile and coding time without a WakaTime snapshot', async () => {
    const markup = await render(createElement(HomeOperatorProfileSection, { totalCodingTime: undefined, formattedSnapshot: null }))

    expect(markup).toContain('Coding time by language')
    expect(markup).toContain('WakaTime public-share stats are temporarily unavailable.')
  })

  test('shows the recent notes empty state', async () => {
    const markup = await render(createElement(HomeRecentNotesSection, { posts: [] }))

    expect(markup).toContain('Notes from the field.')
    expect(markup).toContain('No notes published yet. The editor is waiting.')
  })
})
