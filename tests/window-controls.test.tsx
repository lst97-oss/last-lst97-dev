import { describe, expect, test } from 'bun:test'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { WindowControls } from '../src/components/site/window/window-controls'

async function render(controls: { minimize?: boolean; maximize?: boolean; close?: boolean }) {
  const element = createElement(WindowControls, {
    title: 'sample.exe',
    windowId: 'sample.exe',
    windowMode: 'normal',
    closeHref: '/',
    controls,
  })
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

describe('window controls', () => {
  test('renders the default controls and can hide all controls', async () => {
    const visible = await render({})
    const hidden = await render({ minimize: false, maximize: false, close: false })

    expect(visible).toContain('Minimize sample.exe')
    expect(visible).toContain('Maximize sample.exe')
    expect(visible).toContain('Close sample.exe')
    expect(hidden).not.toContain('window-controls')
  })
})
