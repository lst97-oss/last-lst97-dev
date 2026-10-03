import { describe, expect, test } from 'bun:test'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChangelogCard, PostCard, ProjectCard } from '../src/components/site/content/card'
import { RichText } from '../src/components/site/content/rich-text'
import type { ChangelogSummary, PostSummary, ProjectSummary } from '../src/server/content/types'

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
  updatedAt: '2026-09-21T00:00:00.000Z',
  createdAt: '2026-09-19T00:00:00.000Z',
  tags: ['build logs', 'open source'],
  coverImage: { url: '/media/terminal.png', alt: 'A pixel terminal' },
}

const project: ProjectSummary = {
  slug: 'studio',
  title: 'Studio',
  summary: 'A small creative workspace.',
  technologies: ['TypeScript', 'React'],
  topics: [],
  tags: [],
  featured: true,
  coverImage: { url: '/media/studio.png', alt: 'Studio dashboard' },
  gallery: [],
  role: 'Engineer',
  projectStatus: 'in_progress',
  startDate: '2025-01-01',
  endDate: null,
  updatedAt: '2026-09-21T00:00:00.000Z',
}

const changelog: ChangelogSummary = {
  slug: 'v1-2-0',
  title: 'Release 1.2.0',
  version: 'v1.2.0',
  excerpt: 'Adaptive cards everywhere.',
  publishedAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-29T00:00:00.000Z',
  createdAt: '2026-09-27T00:00:00.000Z',
  tags: ['release'],
  changeTypes: ['feature', 'bug_fix'],
  coverImage: { url: '/media/release.png', alt: 'Release art' },
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

  test('loads the featured project cover eagerly, but keeps grid covers lazy', async () => {
    // The home page renders one featured project card and it is the largest
    // above-the-fold image there, so it is the likely LCP element. It must not be
    // lazy. Every other project card in a listing grid stays lazy, so a page of
    // results never eagerly fetches all of its covers.
    const featured = await renderCard(createElement(ProjectCard, { project, featured: true }))
    const grid = await renderCard(createElement(ProjectCard, { project, featured: false }))

    expect(featured).toContain('loading="eager"')
    expect(featured).toContain('fetchPriority="high"')
    expect(featured).toContain('decoding="sync"')

    expect(grid).toContain('loading="lazy"')
    expect(grid).toContain('fetchPriority="auto"')
    expect(grid).not.toContain('fetchPriority="high"')
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
            children: [
              { type: 'text', text: 'Important', format: 1, detail: 0, mode: 'normal', style: '', version: 1 },
            ],
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
                children: [
                  { type: 'text', text: 'First step', format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
                ],
              },
            ],
          },
          {
            type: 'quote',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              { type: 'text', text: 'Keep it useful.', format: 2, detail: 0, mode: 'normal', style: '', version: 1 },
            ],
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

  test('renders Markdown tables and fenced code blocks stored as Lexical nodes', () => {
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'table',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              {
                type: 'tablerow',
                version: 1,
                direction: null,
                format: '',
                indent: 0,
                children: [
                  {
                    type: 'tablecell',
                    version: 1,
                    headerState: 1,
                    colSpan: 1,
                    rowSpan: 1,
                    children: [
                      {
                        type: 'paragraph',
                        version: 1,
                        direction: null,
                        format: '',
                        indent: 0,
                        children: [{ type: 'text', text: 'Metric', format: 0 }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'block',
            version: 1,
            fields: { blockType: 'Code', code: 'const answer = 42', language: 'typescript' },
            format: '',
            direction: null,
            indent: 0,
          },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))
    expect(markup).toContain('<table>')
    expect(markup).toContain('<th')
    expect(markup).toContain('Metric')
    // A fenced TypeScript block renders through the shared code view, not as a
    // bare <pre><code>: the badge and the line numbers are the observable proof
    // that the language reached the highlighter.
    expect(markup).toContain('code-block-language')
    expect(markup).toContain('TypeScript')
    expect(markup).toContain('linenumber')
    expect(markup).toContain('const')
  })

  test('a mermaid code block renders as a diagram shell, not a code listing', () => {
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
            children: [{ type: 'text', text: 'Architecture', format: 0 }],
          },
          {
            type: 'block',
            version: 2,
            fields: {
              blockType: 'Code',
              code: 'flowchart TB\n  a["A"] --> b["B"]',
              language: 'mermaid',
              id: 'block-1',
            },
            format: '',
            direction: null,
            indent: 0,
          },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))
    expect(markup).toContain('mermaid-diagram-shell')
    expect(markup).toContain('aria-label="Architecture flowchart"')
    // The listing chrome must be absent: a diagram that also shipped a code
    // block would print the source twice.
    expect(markup).not.toContain('code-block-language')
    expect(markup).not.toContain('linenumber')
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
                children: [
                  {
                    type: 'text',
                    text: 'Complete the task',
                    format: 0,
                    detail: 0,
                    mode: 'normal',
                    style: '',
                    version: 1,
                  },
                ],
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
            value: {
              url: '/media/in-article.png',
              mimeType: 'image/png',
              filename: 'in-article.png',
              alt: 'Pixel landscape',
            },
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
    // The in-prose image is a click target into the shared viewer. It carries
    // the shared width-descriptor `srcset` and a lazy/async load hint rather
    // than the old `<picture>` art-direction sources, whose `media` queries
    // were built from image width instead of viewport width.
    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain('decoding="async"')
    expect(markup).toContain('sizes="(min-width: 1024px) 768px, 100vw"')
    expect(markup).toContain('aria-label="View full size image: Pixel landscape"')
  })

  test('numbers every in-prose image so the viewer steps through the whole article', () => {
    const uploadNode = (url: string, alt: string) => ({
      type: 'upload',
      id: `upload-${url}`,
      relationTo: 'media',
      value: { url, mimeType: 'image/png', filename: `${alt}.png`, alt },
      fields: { alt },
      format: '',
      version: 1,
    })
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [uploadNode('/media/one.png', 'First'), uploadNode('/media/two.png', 'Second')],
      },
    }

    const markup = render(createElement(RichText, { value: content }))

    expect(markup).toContain('src="/media/one.png"')
    expect(markup).toContain('src="/media/two.png"')
    expect(markup).toContain('aria-label="View full size image: First"')
    expect(markup).toContain('aria-label="View full size image: Second"')
  })

  test('an unsafe in-prose image renders no click target', () => {
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
            id: 'upload-unsafe',
            relationTo: 'media',
            value: { url: 'javascript:alert(1)', mimeType: 'image/png', filename: 'x.png', alt: 'Bad' },
            fields: { alt: 'Bad' },
            format: '',
            version: 1,
          },
          {
            type: 'upload',
            id: 'upload-safe',
            relationTo: 'media',
            value: { url: '/media/safe.png', mimeType: 'image/png', filename: 'safe.png', alt: 'Safe' },
            fields: { alt: 'Safe' },
            format: '',
            version: 1,
          },
        ],
      },
    }

    const markup = render(createElement(RichText, { value: content }))

    expect(markup).not.toContain('javascript:')
    // The safe image is still first in the viewer's list even though an unsafe
    // node preceded it in the document.
    expect(markup).toContain('aria-label="View full size image: Safe"')
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
                children: [
                  { type: 'text', text: 'click me', format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
                ],
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
    const markup = await renderCard(
      createElement(PostCard, { post: { ...post, coverImage: { url: null, alt: null } } }),
    )

    expect(markup).not.toContain('<img')
  })

  test('does not render executable cover URLs from CMS data', async () => {
    const markup = await renderCard(
      createElement(PostCard, {
        post: { ...post, coverImage: { url: 'javascript:alert(1)', alt: 'Unsafe' } },
      }),
    )

    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('javascript:')
  })

  test('renders a deterministic placeholder block when a CMS cover is missing', async () => {
    const markup = await renderCard(
      createElement(PostCard, { post: { ...post, coverImage: { url: null, alt: null } } }),
    )

    expect(markup).toContain('grid-cols-4')
    expect(markup).toContain('aria-label="Shipping small tools"')
    expect(markup).not.toContain('<img')
  })

  test('renders the same placeholder markup for the same slug on every render', async () => {
    const withoutCover = { ...post, coverImage: { url: null, alt: null } }

    const first = await renderCard(createElement(PostCard, { post: withoutCover }))
    const second = await renderCard(createElement(PostCard, { post: withoutCover }))

    // Server and client must agree, or hydration rewrites the cover slot.
    expect(second).toBe(first)
  })

  test('renders a different placeholder for a different slug', async () => {
    const base = await renderCard(createElement(PostCard, { post: { ...post, coverImage: { url: null, alt: null } } }))
    const other = await renderCard(
      createElement(PostCard, {
        post: { ...post, slug: 'another-note', coverImage: { url: null, alt: null } },
      }),
    )

    expect(other).not.toBe(base)
  })

  test('clamps every card summary to three lines so one card cannot tower over the grid', async () => {
    // The masonry packs by measured height; an unbounded excerpt makes a single
    // card ~1000px tall and the row reads as a dead hole next to it.
    for (const markup of [
      await renderCard(createElement(PostCard, { post })),
      await renderCard(createElement(ProjectCard, { project })),
      await renderCard(createElement(ChangelogCard, { entry: changelog })),
    ]) {
      expect(markup).toContain('line-clamp-3')
      expect(markup).not.toMatch(/<p class="mb-4 text-muted-foreground">/)
    }
  })

  test('renders changelog cover art, version, and change types', async () => {
    const markup = await renderCard(createElement(ChangelogCard, { entry: changelog }))

    expect(markup).toContain('src="/media/release.png"')
    expect(markup).toContain('alt="Release art"')
    expect(markup).toContain('v1.2.0')
    expect(markup).toContain('FEATURE')
    expect(markup).toContain('BUG FIX')
  })

  test('shows a date on every card type', async () => {
    // Posts and changelogs carry the date in the kicker; projects have no
    // publication date, so they show the last update instead.
    expect(await renderCard(createElement(PostCard, { post }))).toContain('NOTE / ')
    expect(await renderCard(createElement(ChangelogCard, { entry: changelog }))).toContain('CHANGELOG / ')

    const projectMarkup = await renderCard(createElement(ProjectCard, { project }))
    expect(projectMarkup).toContain('UPDATED / ')
    expect(projectMarkup).toMatch(/UPDATED \/ \d/)
  })

  test('omits the project date row when no date is usable', async () => {
    const markup = await renderCard(
      createElement(ProjectCard, {
        project: { ...project, updatedAt: '' },
      }),
    )

    expect(markup).not.toContain('UPDATED / ')
  })
})
