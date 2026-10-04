import { describe, expect, test } from 'bun:test'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  BlogListSkeleton,
  ChangelogCardSkeleton,
  ChangelogListSkeleton,
  ContentDetailSkeleton,
  HomeSkeleton,
  PixelSkeletonCover,
  PostCardSkeleton,
  ProjectCardSkeleton,
  ProjectDetailSkeleton,
  ProjectListSkeleton,
} from '../src/components/ui/skeletons'

function markup(element: ReactElement): string {
  return renderToStaticMarkup(element)
}

function occurrences(source: string, needle: string): number {
  return source.split(needle).length - 1
}

/** Every skeleton renders one root marked for its variant and hidden from the
 *  assistive-tech tree: a pending region carries no real content, so announcing
 *  empty blocks would only be noise. */
const LIST_SKELETONS: [variant: string, element: ReactElement][] = [
  ['blog-list', <BlogListSkeleton key="blog" />],
  ['project-list', <ProjectListSkeleton key="project" />],
  ['changelog-list', <ChangelogListSkeleton key="changelog" />],
]

describe('skeleton roots', () => {
  test('every skeleton marks its variant and hides itself from the a11y tree', () => {
    const cases: [string, ReactElement][] = [
      ...LIST_SKELETONS,
      ['home', <HomeSkeleton key="home" />],
      [
        'content-detail',
        <ContentDetailSkeleton backLabel="← BACK TO NOTES" icon="✎" key="detail" windowTitle="note://…" />,
      ],
      [
        'project-detail',
        <ProjectDetailSkeleton
          backLabel="← BACK TO PROJECTS"
          icon="▤"
          key="project-detail"
          windowTitle="project://…"
        />,
      ],
    ]

    for (const [variant, element] of cases) {
      const html = markup(element)
      expect(html).toContain(`data-skeleton="${variant}"`)
      expect(html).toContain('aria-hidden="true"')
    }
  })

  test('no skeleton renders a link or a nav landmark', () => {
    // A pending card must not be clickable, and an unlabelled `nav` would be
    // an accessibility defect: the real pagination is an anchor row, but
    // there is nothing to navigate to until the data lands.
    for (const [, element] of LIST_SKELETONS) {
      const html = markup(element)
      expect(html).not.toContain('<a')
      expect(html).not.toContain('<nav')
    }

    const detail = markup(<ContentDetailSkeleton backLabel="← BACK TO NOTES" icon="✎" windowTitle="note://…" />)
    expect(detail).not.toContain('<a')
    expect(detail).not.toContain('<nav')
  })
})

describe('list skeletons', () => {
  test('each list fills the nine-card page its loader requests', () => {
    // All three index loaders page at 9; a different count would change the
    // page height the moment the data lands.
    for (const [, element] of LIST_SKELETONS) {
      const html = markup(element)
      expect(occurrences(html, 'content-card')).toBe(9)
      expect(occurrences(html, 'grid-cols-4 grid-rows-4')).toBe(9)
    }
  })

  test('each list stubs the full pagination control row', () => {
    // Two arrows and four page squares; the gap marker is a bar, not a slot.
    for (const [, element] of LIST_SKELETONS) {
      const html = markup(element)
      expect(occurrences(html, 'data-pagination-slot=')).toBe(6)
      expect(occurrences(html, 'size-10')).toBe(6)
    }
  })

  test('both filterable lists carry the search and topic filter rows', () => {
    // `/projects` and `/blog` both load topics and both render `ListFilters`;
    // the changelog listing has neither, so a filter row there would promise
    // navigation that does not exist.
    const topicRow = 'h-6 w-24'
    const searchRow = 'h-10 w-full'

    expect(occurrences(markup(<BlogListSkeleton />), topicRow)).toBe(5)
    expect(occurrences(markup(<ProjectListSkeleton />), topicRow)).toBe(5)
    expect(markup(<BlogListSkeleton />)).toContain(searchRow)
    expect(markup(<ProjectListSkeleton />)).toContain(searchRow)
    expect(markup(<ChangelogListSkeleton />)).not.toContain(topicRow)
    expect(markup(<ChangelogListSkeleton />)).not.toContain(searchRow)
  })

  test('each list opens its own window frame', () => {
    expect(markup(<BlogListSkeleton />)).toContain('data-window-title="notes.directory"')
    expect(markup(<ProjectListSkeleton />)).toContain('data-window-title="projects.archive"')
    expect(markup(<ChangelogListSkeleton />)).toContain('data-window-title="changelog.log"')
  })
})

describe('card skeletons', () => {
  test('each card carries exactly one seeded cover mosaic', () => {
    // The mosaic is the 4x4 tone grid PlaceholderArt renders; a card with zero
    // or two covers would misreport the layout the real card is about to take.
    for (const card of [
      <PostCardSkeleton key="post" />,
      <ProjectCardSkeleton key="project" />,
      <ChangelogCardSkeleton key="changelog" />,
    ]) {
      const html = markup(card)
      expect(occurrences(html, 'grid-cols-4 grid-rows-4')).toBe(1)
      expect(occurrences(html, '-mx-5 mb-4 aspect-video')).toBe(1)
    }
  })

  test('different seeds produce different cover mosaics', () => {
    // PlaceholderArt picks one of six patterns by hashing the seed. Identical
    // covers across a page would read as a broken placeholder, not as art.
    const alpha = markup(<PixelSkeletonCover seed="alpha" />)
    const beta = markup(<PixelSkeletonCover seed="beta" />)

    expect(occurrences(alpha, 'grid-cols-4 grid-rows-4')).toBe(1)
    expect(occurrences(beta, 'grid-cols-4 grid-rows-4')).toBe(1)
    expect(alpha).not.toBe(beta)
  })

  test('the featured project card switches to the capped cover', () => {
    // `project-card--featured` is what narrows the cover on the home page's
    // single-card window; without it a full-bleed cover spans that whole window.
    const featured = markup(<ProjectCardSkeleton featured />)
    expect(featured).toContain('project-card--featured')
    expect(featured).toContain('project-card-cover')
    expect(featured).not.toContain('-mx-5 mb-4 aspect-video')

    const archived = markup(<ProjectCardSkeleton />)
    expect(archived).toContain('-mx-5 mb-4 aspect-video')
  })
})

describe('detail skeletons', () => {
  const BASE = { backLabel: '← BACK TO NOTES', icon: '✎', windowTitle: 'note://…' } as const

  test('the badges and topics flags each add a label row', () => {
    const both = markup(<ContentDetailSkeleton {...BASE} />)
    const noteOnly = markup(<ContentDetailSkeleton {...BASE} badges={false} topics />)
    const entryOnly = markup(<ContentDetailSkeleton {...BASE} badges topics={false} />)
    const neither = markup(<ContentDetailSkeleton {...BASE} badges={false} topics={false} />)

    // One `my-6` tag row plus one `-mt-4 mb-6` row per enabled flag, so a
    // skeleton that ignored a flag would reserve the wrong vertical space.
    // Both rows hold `Tag` chips — tags, badges, and topics are all `Tag` in
    // `ContentDetailLayout` — so the count is what distinguishes them.
    expect(occurrences(both, 'post-tags my-6')).toBe(1)
    expect(occurrences(both, 'post-tags -mt-4 mb-6')).toBe(2)
    expect(occurrences(noteOnly, 'post-tags -mt-4 mb-6')).toBe(1)
    expect(occurrences(entryOnly, 'post-tags -mt-4 mb-6')).toBe(1)
    expect(occurrences(neither, 'post-tags -mt-4 mb-6')).toBe(0)
  })

  test('the detail skeleton mirrors the layout block order', () => {
    // Back link, cover, title, lead, byline, tags, article body — the order
    // `ContentDetailLayout` renders, so swapping in the content moves nothing.
    const html = markup(<ContentDetailSkeleton {...BASE} />)

    const backLink = html.indexOf('back-link')
    const cover = html.indexOf('aspect-video max-h-105')
    const meta = html.indexOf('detail-meta')
    const tags = html.indexOf('post-tags my-6')
    const body = html.indexOf('article-body')

    expect(backLink).toBeGreaterThan(-1)
    expect(backLink).toBeLessThan(cover)
    expect(cover).toBeLessThan(meta)
    expect(meta).toBeLessThan(tags)
    expect(tags).toBeLessThan(body)
    expect(html).toContain('data-back-label="← BACK TO NOTES"')
  })

  test('the project detail skeleton adds the project-only sections', () => {
    // Facts, technologies, links, and the gallery exist only on the project
    // page; a missing block here means the loaded page jumps after the swap.
    const html = markup(<ProjectDetailSkeleton backLabel="← BACK TO PROJECTS" icon="▤" windowTitle="project://…" />)

    expect(html).toContain('project-detail-meta')
    expect(html).toContain('project-links')
    expect(html).toContain('project-gallery')
    expect(html).toContain('article-body--wide')
    // The main cover plus the two gallery tiles.
    expect(occurrences(html, 'grid-cols-4 grid-rows-4')).toBe(3)
  })
})

describe('home skeleton', () => {
  test('opens every home window the page renders', () => {
    const html = markup(<HomeSkeleton />)

    // The featured note is a lead card inside `latest-notes.directory` now, not
    // a window of its own.
    for (const title of ['welcome.exe', 'featured-project.app', 'operator.profile', 'latest-notes.directory']) {
      expect(html).toContain(`data-window-title="${title}"`)
    }
  })

  test('keeps the featured project in its single-card window', () => {
    const html = markup(<HomeSkeleton />)

    expect(html).toContain('project-card--featured')
    expect(html).toContain('dashboard-grid grid gap-6 lg:grid-cols-5')
  })

  test('stubs the three notes the recent-notes section renders', () => {
    // `loadPosts` returns six and the section slices to three, so the grid
    // holds three note cards plus the featured project's single card.
    const html = markup(<HomeSkeleton />)

    expect(occurrences(html, 'content-card')).toBe(4)
    expect(occurrences(html, 'grid-cols-4 grid-rows-4')).toBe(5)
  })
})
