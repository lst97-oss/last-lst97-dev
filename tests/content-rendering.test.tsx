import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'

import { PostCard, ProjectCard } from '../src/components/site/content/card'
import { RichText } from '../src/components/site/content/rich-text'
import type { PostSummary, ProjectSummary } from '../src/server/content/types'

function render(element: ReactElement) {
  return renderToStaticMarkup(element)
}

async function renderCard(element: ReactElement) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

const post: PostSummary = {
  slug: 'shipping-small-tools',
  title: 'Shipping small tools',
  excerpt: 'A note about useful software.',
  publishedAt: '2026-09-20T00:00:00.000Z',
  tags: ['build logs', 'open source'],
  coverImage: { url: '/media/terminal.png', alt: 'A pixel terminal' },
}

const project: ProjectSummary = {
  slug: 'studio',
  title: 'Studio',
  summary: 'A small creative workspace.',
  technologies: ['TypeScript', 'React'],
  featured: true,
  coverImage: { url: '/media/studio.png', alt: 'Studio dashboard' },
  role: 'Engineer',
  projectStatus: 'in_progress',
  startDate: '2025-01-01',
  endDate: null,
}

describe('Payload content presentation', () => {
  test('renders blog cover art and editorial tags from the Payload summary', async () => {
    const markup = await renderCard(createElement(PostCard, { post }))

    expect(markup).toContain('<img')
    expect(markup).toContain('src="/media/terminal.png"')
    expect(markup).toContain('alt="A pixel terminal"')
    expect(markup).toContain('build logs')
    expect(markup).toContain('open source')
  })

  test('renders project cover art alongside its existing metadata and technologies', async () => {
    const markup = await renderCard(createElement(ProjectCard, { project }))

    expect(markup).toContain('src="/media/studio.png"')
    expect(markup).toContain('alt="Studio dashboard"')
    expect(markup).toContain('IN PROGRESS')
    expect(markup).toContain('2025–PRESENT')
    expect(markup).toContain('TypeScript')
  })

  test('renders Payload Lexical formatting, headings, ordered lists, quotes, and rules', () => {
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'heading',
            tag: 'h2',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [{ type: 'text', text: 'Important', format: 1, detail: 0, mode: 'normal', style: '', version: 1 }],
          },
          {
            type: 'list',
            tag: 'ol',
            listType: 'number',
            start: 1,
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              {
                type: 'listitem',
                value: 1,
                version: 1,
                direction: null,
                format: '',
                indent: 0,
                children: [{ type: 'text', text: 'First step', format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
              },
            ],
          },
          {
            type: 'quote',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [{ type: 'text', text: 'Keep it useful.', format: 2, detail: 0, mode: 'normal', style: '', version: 1 }],
          },
          { type: 'horizontalrule', version: 1 },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))

    expect(markup).toContain('<h2><strong>Important</strong></h2>')
    expect(markup).toContain('<ol class="list-number">')
    expect(markup).toContain('First step')
    expect(markup).toContain('<blockquote><em>Keep it useful.</em></blockquote>')
    expect(markup).toContain('<hr')
  })

  test('renders checklist input identifiers deterministically for server and client hydration', () => {
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'list',
            tag: 'ul',
            listType: 'check',
            start: 1,
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              {
                type: 'listitem',
                value: 1,
                checked: true,
                version: 1,
                direction: null,
                format: '',
                indent: 0,
                children: [{ type: 'text', text: 'Complete the task', format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
              },
            ],
          },
        ],
      },
    }

    const serverMarkup = render(createElement(RichText, { value: content }))
    const secondMarkup = render(createElement(RichText, { value: content }))

    expect(serverMarkup).toBe(secondMarkup)
    expect(serverMarkup).toContain('type="checkbox"')
    expect(serverMarkup).toContain('Complete the task')
  })

  test('renders populated uploads and related blog/project records', () => {
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'upload',
            id: 'upload-1',
            relationTo: 'media',
            value: { url: '/media/in-article.png', mimeType: 'image/png', filename: 'in-article.png', alt: 'Pixel landscape' },
            fields: { alt: 'Pixel landscape' },
            format: '',
            version: 1,
          },
          {
            type: 'relationship',
            relationTo: 'projects',
            value: { id: 'project-1', slug: 'studio', title: 'Studio', summary: 'A small creative workspace.' },
            format: '',
            version: 1,
          },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))

    expect(markup).toContain('src="/media/in-article.png"')
    expect(markup).toContain('alt="Pixel landscape"')
    expect(markup).toContain('href="/projects/studio"')
    expect(markup).toContain('Studio')
  })

  test('renders unsafe Payload link destinations as text instead of executable links', () => {
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              {
                type: 'link',
                fields: { linkType: 'custom', url: 'javascript:alert(1)', newTab: true },
                version: 1,
                direction: null,
                format: '',
                indent: 0,
                children: [{ type: 'text', text: 'click me', format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
              },
            ],
          },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))

    expect(markup).toContain('click me')
    expect(markup).not.toContain('href="javascript:')
    expect(markup).not.toContain('target="_blank"')
  })

  test('does not turn an unsafe uploaded-file URL into an executable link', () => {
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'upload',
            id: 'upload-2',
            relationTo: 'media',
            value: { url: 'javascript:alert(1)', mimeType: 'text/html', filename: 'readme.html' },
            fields: {},
            format: '',
            version: 1,
          },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))

    expect(markup).not.toContain('href="javascript:')
    expect(markup).not.toContain('readme.html')
  })

  test('does not render an empty image element when a CMS cover is missing', async () => {
    const markup = await renderCard(createElement(PostCard, { post: { ...post, coverImage: { url: null, alt: null } } }))

    expect(markup).not.toContain('<img')
  })

  test('does not render executable cover URLs from CMS data', async () => {
    const markup = await renderCard(createElement(PostCard, {
      post: { ...post, coverImage: { url: 'javascript:alert(1)', alt: 'Unsafe' } },
    }))

    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('javascript:')
  })
})
