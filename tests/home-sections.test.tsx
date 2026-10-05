import { afterEach, describe, expect, test } from 'bun:test'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import type { Window } from 'happy-dom'
import { act, createElement, type ReactElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { useFeaturedCarousel } from '../src/components/site/home/featured-carousel'
import { HomeFeaturedProjectSection } from '../src/components/site/home/featured-project-section'
import { HomeHeroSection } from '../src/components/site/home/hero-section'
import { HomeOperatorProfileSection } from '../src/components/site/home/operator-profile-section'
import { HomeRecentNotesSection } from '../src/components/site/home/recent-notes-section'
import { osStore } from '../src/lib/os-store'
import type { PostSummary, ProjectSummary } from '../src/server/content/types'
import { createSiteStyleWindow } from './site-stylesheet'

async function render(element: ReactElement) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

function project(slug: string, featured = true): ProjectSummary {
  return {
    slug,
    title: `Project ${slug}`,
    summary: 'A small creative workspace.',
    technologies: ['TypeScript'],
    topics: [],
    tags: [],
    featured,
    coverImage: { url: `/media/${slug}.png`, alt: `${slug} cover` },
    gallery: [],
    role: 'Engineer',
    projectStatus: 'in_progress',
    startDate: '2025-01-01',
    endDate: null,
    updatedAt: '2026-09-21T00:00:00.000Z',
  }
}

function note(slug: string): PostSummary {
  return {
    slug,
    title: `Note ${slug}`,
    excerpt: 'A short field note.',
    publishedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
    tags: [],
    topics: [],
    coverImage: { url: `/media/${slug}.png`, alt: `${slug} cover` },
    createdAt: '2026-09-01T00:00:00.000Z',
  }
}

/**
 * Rendering the real component needs DOM globals, and this file is not the only
 * one in the shared `bun test` process: a leaked `window`/`document` makes every
 * later suite read a synthetic environment. Record each override and put it back
 * exactly as it was, the way `masonry-rows.test.ts` does.
 */
const SAVED_GLOBALS = [
  'window',
  'document',
  'HTMLElement',
  'IS_REACT_ACT_ENVIRONMENT',
  'ResizeObserver',
  'scrollTo',
] as const

const savedGlobals = new Map<string, { present: boolean; value: unknown }>()

function installDomGlobals(window: Window) {
  const target = globalThis as Record<string, unknown>
  for (const name of SAVED_GLOBALS) {
    savedGlobals.set(name, { present: name in target, value: target[name] })
  }
  target.window = window
  target.document = window.document
  target.HTMLElement = window.HTMLElement
  target.IS_REACT_ACT_ENVIRONMENT = true
  target.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  // TanStack's scroll restoration calls a BARE global `scrollTo`, which happy-dom
  // does not define. The throw lands inside a router settle and aborts the
  // render that triggered it, so the tree silently ends up empty.
  target.scrollTo = () => {}
}

// A tree still mounted when its `window` is restored unmounts against a torn-down
// DOM, and the carousel's cleanup then throws. Unmount before restoring.
const mountedRoots: { unmount: () => void }[] = []

afterEach(async () => {
  await act(async () => {
    for (const root of mountedRoots.splice(0)) root.unmount()
  })
  const target = globalThis as Record<string, unknown>
  for (const [name, previous] of savedGlobals) {
    if (previous.present) target[name] = previous.value
    else delete target[name]
  }
  savedGlobals.clear()
  osStore.setState(() => ({ activeWindowId: null, windowModes: {} }))
})

type Timer = { delayMs: number; run: () => void }

/**
 * Mounts one home section with real DOM globals and returns handles for driving
 * it. The carousels only move through control presses, so a test has to mount
 * the component rather than read its markup once.
 */
async function mountSection(element: ReactElement, options: { reducedMotion?: boolean } = {}) {
  const { window } = await createSiteStyleWindow()
  installDomGlobals(window)
  // happy-dom reports a fixed viewport; `useIsMobile` reads this one value, and
  // both carousels deliberately fall back below the 768px breakpoint.
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  if (options.reducedMotion) {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia
  }

  // Record the autoplay timer instead of waiting five real seconds: what matters
  // is the registered delay, the per-tick advance, and the wrap.
  const liveIds = new Map<number, Timer>()
  let nextIntervalId = 1
  window.setInterval = ((handler: TimerHandler, delayMs?: number) => {
    const id = nextIntervalId++
    liveIds.set(id, {
      delayMs: delayMs ?? 0,
      run: () => {
        if (typeof handler === 'function') handler()
      },
    })
    return id as unknown as number
  }) as unknown as typeof window.setInterval
  window.clearInterval = ((id: number) => {
    liveIds.delete(id)
  }) as unknown as typeof window.clearInterval

  const host = window.document.createElement('div')
  window.document.body.append(host)
  const root = createRoot(host as unknown as Element)
  mountedRoots.push(root)

  // The cards render router `Link`s, so a mounted tree needs a router. The
  // section is the root route's own component: a bare root route resolves to its
  // not-found component and replaces the tree with `<p>Not Found</p>`.
  const route = createRootRoute({ component: () => element })
  // happy-dom has no global `scrollTo`, and the router's scroll restoration
  // calls it bare on every settle — the throw unmounts the whole tree mid-test.
  const router = createRouter({
    routeTree: route,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    scrollRestoration: false,
  })
  await router.load()

  await act(async () => {
    root.render(createElement(RouterProvider, { router }))
  })

  return { window, host, liveTimers: () => [...liveIds.values()] }
}

function mountProjects(projects: ProjectSummary[], options?: { reducedMotion?: boolean }) {
  return mountSection(createElement(HomeFeaturedProjectSection, { projects }), options)
}

/** The section takes one prop, so mounting takes the note list directly. */
function mountNotes(posts: PostSummary[], options?: { reducedMotion?: boolean }) {
  return mountSection(createElement(HomeRecentNotesSection, { posts }), options)
}

/** Index of the dot marking the active slide, or -1 when none is active. */
function activeDotIndex(window: Window): number {
  return [...window.document.querySelectorAll('.featured-carousel-dot')].findIndex(
    (dot) => dot.getAttribute('aria-current') === 'true',
  )
}

async function press(window: Window, label: string) {
  const control = [...window.document.querySelectorAll('button')].find(
    (button) => button.getAttribute('aria-label') === label,
  )
  if (!control) throw new Error(`No control labelled "${label}"`)
  await act(async () => {
    control.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })
}

function maximizeFeaturedWindow() {
  osStore.setState(() => ({
    activeWindowId: 'featured-project.app',
    windowModes: { 'featured-project.app': 'maximized' as const },
  }))
}

describe('home sections', () => {
  test('keeps the welcome content and profile details together', async () => {
    const markup = await render(createElement(HomeHeroSection))

    expect(markup).toContain('SYSTEM MESSAGE / 001')
    expect(markup).toContain('Open-source builder focused on useful tools.')
    expect(markup).toContain('CURRENT FOCUS')
  })

  test('shows the existing empty state when there is no featured project', async () => {
    const markup = await render(createElement(HomeFeaturedProjectSection, { projects: [] }))

    expect(markup).toContain('Project archive is ready for its first upload.')
    expect(markup).toContain('START A CONVERSATION')
  })

  test('shows the operator profile and coding time without a WakaTime snapshot', async () => {
    const markup = await render(
      createElement(HomeOperatorProfileSection, { totalCodingTime: undefined, formattedSnapshot: null }),
    )

    expect(markup).toContain('Coding time by language')
    expect(markup).toContain('WakaTime public-share stats are temporarily unavailable.')
  })

  test('shows the recent notes empty state', async () => {
    const markup = await render(createElement(HomeRecentNotesSection, { posts: [] }))

    expect(markup).toContain('Notes from the field.')
    expect(markup).toContain('No notes published yet. The editor is waiting.')
  })
})

describe('featured-project carousel', () => {
  test('rotates only the projects flagged featured', async () => {
    const { window, host } = await mountProjects([project('alpha'), project('beta'), project('gamma', false)])

    expect(host.innerHTML).toContain('Project alpha')
    expect(host.innerHTML).toContain('Project beta')
    expect(host.innerHTML).not.toContain('Project gamma')
    // Two slides and two dots: the archive project gets neither.
    expect(window.document.querySelectorAll('.featured-carousel-slide')).toHaveLength(2)
    expect(window.document.querySelectorAll('.featured-carousel-dot')).toHaveLength(2)
  })

  test('wraps past the last slide back to the first', async () => {
    const { window } = await mountProjects([project('alpha'), project('beta'), project('gamma')])

    expect(activeDotIndex(window)).toBe(0)

    for (let pressNumber = 0; pressNumber < 3; pressNumber += 1) {
      await press(window, 'Next featured project')
      // Exactly one dot is active at any moment, even mid-loop.
      expect(
        [...window.document.querySelectorAll('.featured-carousel-dot')].filter(
          (dot) => dot.getAttribute('aria-current') === 'true',
        ),
      ).toHaveLength(1)
    }

    // Three slides, three presses: back where it started.
    expect(activeDotIndex(window)).toBe(0)

    await press(window, 'Previous featured project')
    expect(activeDotIndex(window)).toBe(2)
  })

  test('advances one slide every five seconds and loops', async () => {
    const { window, liveTimers } = await mountProjects([project('alpha'), project('beta'), project('gamma')])

    const [timer] = liveTimers()
    expect(liveTimers()).toHaveLength(1)
    expect(timer.delayMs).toBe(5_000)

    await act(async () => timer.run())
    expect(activeDotIndex(window)).toBe(1)

    await act(async () => timer.run())
    expect(activeDotIndex(window)).toBe(2)

    await act(async () => timer.run())
    expect(activeDotIndex(window)).toBe(0)
  })

  test('never registers autoplay when the visitor asked for reduced motion', async () => {
    const { liveTimers } = await mountProjects([project('alpha'), project('beta')], { reducedMotion: true })

    expect(liveTimers()).toHaveLength(0)
  })

  test('renders a lone featured project without dead carousel controls', async () => {
    const { window, host, liveTimers } = await mountProjects([project('alpha'), project('beta', false)])

    expect(host.innerHTML).toContain('Project alpha')
    expect(host.innerHTML).not.toContain('featured-carousel')
    // The window frame keeps its own minimize/maximize buttons, so the claim is
    // specifically that no carousel control survived.
    expect(window.document.querySelector('.featured-carousel-controls')).toBeNull()
    expect(liveTimers()).toHaveLength(0)
  })
})

describe('featured-project expanded grid', () => {
  test('pages the full featured set six at a time when the window is maximized', async () => {
    maximizeFeaturedWindow()
    const { window, host } = await mountProjects(
      ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].map((slug) => project(slug)),
    )

    expect(host.innerHTML).toContain('Project one')
    expect(host.innerHTML).toContain('Project six')
    expect(host.innerHTML).not.toContain('Project seven')
    expect(host.querySelector('.card-masonry')).not.toBeNull()

    const nav = window.document.querySelector('nav[aria-label="Featured project pages"]')
    expect([...nav!.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'))).toEqual([
      'Previous page',
      'Go to page 1',
      'Go to page 2',
      'Next page',
    ])

    await press(window, 'Go to page 2')

    expect(host.innerHTML).toContain('Project seven')
    expect(host.innerHTML).not.toContain('Project one')
  })

  test('omits the picker when every featured project fits on one page', async () => {
    maximizeFeaturedWindow()
    const { host } = await mountProjects(['one', 'two', 'three', 'four', 'five', 'six'].map((slug) => project(slug)))

    expect(host.querySelectorAll('.content-card')).toHaveLength(6)
    expect(host.querySelector('nav[aria-label="Featured project pages"]')).toBeNull()
  })

  test('stops autoplay while the window is maximized', async () => {
    maximizeFeaturedWindow()
    const { liveTimers } = await mountProjects(['alpha', 'beta', 'gamma'].map((slug) => project(slug)))

    expect(liveTimers()).toHaveLength(0)
  })
})

test('never exposes an out-of-range page when the pool shrinks under the reader', async () => {
  // Thirteen projects over six per page is three pages. The reader moves to
  // the last one, then a CMS edit drops the pool to seven projects and page 3
  // stops existing. The clamp has to hold during render, not be corrected by
  // an effect afterwards: `act` flushes effects before this test can sample
  // the DOM, so the intermediate frame is only observable at the hook itself.
  // A DOM-level assertion passes against both implementations.
  maximizeFeaturedWindow()
  const thirteen = Array.from({ length: 13 }, (_, index) => project(`p${index + 1}`))
  let shrink = () => {}
  let selectPage: (next: number) => void = () => {}
  const pagePerRender: number[] = []
  const pageSize = 6

  const Probe = () => {
    const [projects, setProjects] = useState(thirteen)
    shrink = () => setProjects(thirteen.slice(0, 7))
    const carousel = useFeaturedCarousel({
      autoplayMs: null,
      count: thirteen.length,
      poolCount: projects.length,
      pageSize,
      windowId: 'featured-project.app',
    })
    selectPage = carousel.setPage
    // Recorded during render, so an effect-based correction has not run yet.
    pagePerRender.push(carousel.page)
    return null
  }

  const { window } = await createSiteStyleWindow()
  installDomGlobals(window)
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  const host = window.document.createElement('div')
  window.document.body.append(host)
  const root = createRoot(host as unknown as Element)
  mountedRoots.push(root)
  await act(async () => {
    root.render(createElement(Probe))
  })

  // Move the reader to the last page (index 2 of 13 projects over six).
  await act(async () => {
    selectPage(2)
  })
  expect(pagePerRender.at(-1)).toBe(2)

  pagePerRender.length = 0
  await act(async () => {
    shrink()
  })

  expect(pagePerRender.length).toBeGreaterThan(0)
  // Seven projects over six per page is two pages, so page 3 must never be
  // handed to the grid, even for one render.
  for (const page of pagePerRender) {
    expect(page).toBeLessThan(Math.ceil(7 / pageSize))
    expect(page).toBeGreaterThanOrEqual(0)
  }
})

function maximizeNotesWindow() {
  osStore.setState(() => ({
    activeWindowId: 'latest-notes.directory',
    windowModes: { 'latest-notes.directory': 'maximized' as const },
  }))
}

describe('latest-notes window', () => {
  test('fills each slide with three notes instead of one', async () => {
    const posts = ['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => note(slug))
    const { window } = await mountNotes(posts)

    const slides = [...window.document.querySelectorAll('.featured-carousel-slide')]
    expect(slides).toHaveLength(2)
    expect(slides[0].querySelectorAll('.content-card')).toHaveLength(3)
    expect(slides[1].querySelectorAll('.content-card')).toHaveLength(3)
    // Two dots for six notes, not six dots for six notes.
    expect(window.document.querySelectorAll('.featured-carousel-dot')).toHaveLength(2)
  })

  test('rotates the recent strip by hand and never starts a timer', async () => {
    // Six notes: two slides of three, so there is something to page between.
    const { window, liveTimers } = await mountNotes(['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => note(slug)))

    expect(activeDotIndex(window)).toBe(0)

    await press(window, 'Next recent notes')
    expect(activeDotIndex(window)).toBe(1)

    // Two slides: one more press wraps back to the first.
    await press(window, 'Next recent notes')
    expect(activeDotIndex(window)).toBe(0)

    await press(window, 'Previous recent notes')
    expect(activeDotIndex(window)).toBe(1)

    // Notes are prose, so the strip never rewrites itself under a reader.
    expect(liveTimers()).toHaveLength(0)
  })

  test('omits the strip controls when the notes fit in one slide of three', async () => {
    const { host, liveTimers } = await mountNotes([note('a'), note('b'), note('c')])

    expect(host.innerHTML).toContain('Note a')
    expect(host.innerHTML).toContain('Note b')
    expect(host.innerHTML).toContain('Note c')
    expect(host.innerHTML).toContain('Notes from the field.')
    // One slide renders as a plain grid: dead arrows and dots would be noise.
    expect(host.querySelector('.featured-carousel-controls')).toBeNull()
    expect(liveTimers()).toHaveLength(0)
  })

  test('shows only the twelve most recently updated notes', async () => {
    // Twenty notes, newest first as the loader orders them. The home window is a
    // digest; `/blog` is the archive, so the thirteenth note must not appear
    // however the strip is paged.
    const posts = Array.from({ length: 20 }, (_, index) => note(`n${index + 1}`))
    const { window, host } = await mountNotes(posts)

    // Twelve at three per slide is four slides and four dots, not seven.
    const slides = [...window.document.querySelectorAll('.featured-carousel-slide')]
    expect(slides).toHaveLength(4)
    expect(window.document.querySelectorAll('.featured-carousel-dot')).toHaveLength(4)
    expect(slides.map((slide) => [...slide.querySelectorAll('.card-title')].map((title) => title.textContent))).toEqual(
      [
        ['Note n1', 'Note n2', 'Note n3'],
        ['Note n4', 'Note n5', 'Note n6'],
        ['Note n7', 'Note n8', 'Note n9'],
        ['Note n10', 'Note n11', 'Note n12'],
      ],
    )
    expect(host.innerHTML).not.toContain('Note n13')
    // The slide ranges are counted from the capped set, not the full archive.
    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
      'Recent notes 1 to 3 of 12',
      'Recent notes 4 to 6 of 12',
      'Recent notes 7 to 9 of 12',
      'Recent notes 10 to 12 of 12',
    ])
  })

  test('always links to the full archive, even when the strip has several slides', async () => {
    const { host } = await mountNotes(Array.from({ length: 12 }, (_, i) => note(`n${i + 1}`)))

    const link = host.querySelector('a[href="/blog"]')
    expect(link?.textContent).toContain('VIEW ALL NOTES')
  })

  test('shows the empty state when nothing is published', async () => {
    const markup = await render(createElement(HomeRecentNotesSection, { posts: [] }))

    expect(markup).toContain('No notes published yet. The editor is waiting.')
  })
})

describe('latest-notes expanded grid', () => {
  test('pages every published note six at a time', async () => {
    maximizeNotesWindow()
    const posts = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((slug) => note(slug))
    const { window, host } = await mountNotes(posts)

    expect(host.querySelectorAll('.content-card')).toHaveLength(6)
    expect(host.innerHTML).not.toContain('Note g')
    expect(host.querySelector('.featured-carousel')).toBeNull()

    const nav = window.document.querySelector('nav[aria-label="Note pages"]')
    expect([...(nav?.querySelectorAll('button') ?? [])].map((button) => button.getAttribute('aria-label'))).toEqual([
      'Previous page',
      'Go to page 1',
      'Go to page 2',
      'Next page',
    ])

    await press(window, 'Go to page 2')

    expect(host.innerHTML).toContain('Note g')
    expect(host.innerHTML).not.toContain('Note a')
  })

  test('omits the picker when every note fits on one page', async () => {
    maximizeNotesWindow()
    const { host } = await mountNotes(['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => note(slug)))

    expect(host.querySelectorAll('.content-card')).toHaveLength(6)
    expect(host.querySelector('nav[aria-label="Note pages"]')).toBeNull()
  })

  test('pages the capped twelve notes, never the whole archive', async () => {
    maximizeNotesWindow()
    const posts = Array.from({ length: 20 }, (_, index) => note(`n${index + 1}`))
    const { window, host } = await mountNotes(posts)

    expect(host.querySelectorAll('.content-card')).toHaveLength(6)
    expect(host.innerHTML).toContain('Note n6')

    // Two pages of six, twelve notes in total: the picker must not offer a
    // fourth page for notes thirteen through twenty.
    const nav = window.document.querySelector('nav[aria-label="Note pages"]')
    expect([...(nav?.querySelectorAll('button') ?? [])].map((button) => button.getAttribute('aria-label'))).toEqual([
      'Previous page',
      'Go to page 1',
      'Go to page 2',
      'Next page',
    ])

    await press(window, 'Go to page 2')

    expect(host.innerHTML).toContain('Note n12')
    expect(host.innerHTML).not.toContain('Note n13')
  })

  test('stops autoplay while the window is maximized', async () => {
    maximizeNotesWindow()
    const { liveTimers } = await mountNotes([note('a'), note('b')])

    expect(liveTimers()).toHaveLength(0)
  })
})
