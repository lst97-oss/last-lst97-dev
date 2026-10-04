import { describe, expect, test } from 'bun:test'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { Window } from 'happy-dom'
import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { ShareDialog } from '../src/components/site/share/share-dialog'
import { SharePreview } from '../src/components/site/share/share-preview'
import { buildShareTargets } from '../src/components/site/share/share-targets'
import { type ShareCopy, useShareCopy } from '../src/components/site/share/use-share-copy'
import { createOgImageAlt, createOgImagePath } from '../src/lib/seo/site-seo'

const SHARE = {
  url: 'https://last-os.invalid/blog/build-notes',
  title: 'Build notes for a small tool',
  description: 'What the week of wiring the build pipeline actually cost.',
  image: {
    url: 'https://last-os.invalid/media/cover-1600.webp',
    alt: 'Cover art',
    width: 1600,
    height: 900,
    isDefault: false,
  },
}

const DEFAULT_CARD = {
  url: `https://last-os.invalid${createOgImagePath(SHARE.title, SHARE.description)}`,
  alt: createOgImageAlt(SHARE.title, SHARE.description),
  width: 1200,
  height: 630,
  isDefault: true,
}

async function render(element: ReactElement) {
  const route = createRootRoute({ component: () => element })
  const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()
  return renderToStaticMarkup(createElement(RouterProvider, { router }))
}

/**
 * These are server renders on purpose.
 *
 * The dialog body cannot be asserted from a mounted tree: `radix-ui` ships its
 * components as `forwardRef` objects, and Bun's module interop drops the
 * `$$typeof` symbol off them, so every `DialogContent` throws "Element type is
 * invalid" and a raw `Dialog` renders no portal at all — even with `forceMount`.
 * That is why `tests/media-gallery.test.tsx` covers `MediaViewer` the same way.
 * The interactive path (open, copy, escape) is verified in a real browser; the
 * parts testable here are the markup, the URL builder, and the copy state
 * machine driven directly.
 */
describe('share dialog', () => {
  test('renders the trigger and no dialog body before it is opened', async () => {
    const markup = await render(createElement(ShareDialog, { ...SHARE }))

    expect(markup).toContain('aria-label="Share this page"')
    expect(markup).toContain('SHARE')
    // A closed Radix dialog renders only its trigger, so a preview or a target
    // in this markup would mean the dialog is not actually gated.
    expect(markup).not.toContain('share-preview')
    expect(markup).not.toContain('share-targets')
  })

  test('passes every share value through to the preview and the link field', async () => {
    const preview = await render(createElement(SharePreview, { ...SHARE }))

    expect(preview).toContain('LAST-OS.INVALID/blog/build-notes')
    expect(preview).toContain(SHARE.title)
    expect(preview).toContain(SHARE.description)
    expect(preview).toContain(SHARE.image.url)
    // A declared intrinsic size is what stops the card from shifting.
    expect(preview).toContain('width="1600"')
    expect(preview).toContain('height="900"')
  })

  test('shows the fallback card and labels it when the document has no cover', async () => {
    const preview = await render(createElement(SharePreview, { ...SHARE, image: DEFAULT_CARD }))

    // The card really is what a scraper would fetch, so the preview renders it
    // rather than showing nothing — but it must not pass the site card off as
    // this document's own artwork.
    // The URL reaches the DOM as an attribute value, so `&` arrives escaped.
    expect(preview).toContain(DEFAULT_CARD.url.replaceAll('&', '&amp;'))
    expect(preview).toContain('SITE DEFAULT CARD — NO COVER IMAGE')
    // A document's own cover carries no such label.
    expect(await render(createElement(SharePreview, { ...SHARE }))).not.toContain('SITE DEFAULT CARD')
  })

  test('previews a caller-supplied URL verbatim when it is not parseable', async () => {
    const preview = await render(createElement(SharePreview, { ...SHARE, url: 'not a url' }))

    expect(preview).toContain('not a url')
  })
})

describe('share targets', () => {
  test('escapes the URL and title, and omits an empty title parameter', () => {
    const targets = buildShareTargets({ url: SHARE.url, title: SHARE.title })

    expect(targets.map((target) => target.label)).toEqual(['COPY LINK', 'X', 'FACEBOOK', 'LINKEDIN'])
    // The clipboard tile acts locally rather than navigating anywhere.
    expect(targets[0]?.href).toBeNull()
    // A title with spaces must arrive percent-encoded, or the query string
    // splits and the text is truncated at the first space.
    expect(targets[1]?.href).toBe(
      `https://x.com/intent/post?url=${encodeURIComponent(SHARE.url)}&text=${encodeURIComponent(SHARE.title)}`,
    )
    expect(targets[2]?.href).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE.url)}`)
    expect(targets[3]?.href).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE.url)}`,
    )

    const untitled = buildShareTargets({ url: SHARE.url, title: '   ' })
    expect(untitled[1]?.href).toBe(`https://x.com/intent/post?url=${encodeURIComponent(SHARE.url)}`)
  })
})

/**
 * The copy hook is driven directly rather than through the dialog, because the
 * dialog cannot be mounted here. `navigator` is installed on `globalThis` — that
 * is where the hook reads it — and restored afterwards, so the shared `bun test`
 * process is left as it was found.
 */
async function mountCopyHook(url: string, writeText: ((value: string) => Promise<void>) | 'absent') {
  // React's DOM renderer needs real globals. happy-dom supplies them, and they
  // are installed only for the lifetime of one hook so the shared `bun test`
  // process is never left with a synthetic `document`.
  const window = new Window()
  const globals = globalThis as Record<string, unknown>
  const SAVED = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'] as const
  const saved = SAVED.map((name) => ({ name, present: name in globals, value: globals[name] }))
  globals.window = window
  globals.document = window.document
  // happy-dom DOES define `navigator.clipboard`, so an absent clipboard has to
  // be constructed rather than inherited.
  globals.navigator =
    writeText === 'absent' ? ({} as Navigator) : ({ clipboard: { writeText } } as unknown as Navigator)
  globals.IS_REACT_ACT_ENVIRONMENT = true

  let latest: ShareCopy | null = null
  function Probe() {
    latest = useShareCopy(url)
    return null
  }

  const host = window.document.createElement('div')
  window.document.body.append(host)
  const root = createRoot(host as unknown as Element)

  return {
    /** Reading before `render()` throws, so the harness cannot be misused. */
    get current(): ShareCopy {
      if (!latest) throw new Error('Hook not rendered')
      return latest
    },
    render: () =>
      act(async () => {
        root.render(createElement(Probe))
      }),
    unmount: async () => {
      await act(async () => root.unmount())
      for (const { name, present, value } of saved) {
        if (present) globals[name] = value
        else delete globals[name]
      }
    },
  }
}

describe('share copy', () => {
  test('writes the canonical URL, confirms it, then reverts on its own', async () => {
    const written: string[] = []
    const hook = await mountCopyHook(SHARE.url, (value) => (written.push(value), Promise.resolve()))

    await hook.render()
    expect(hook.current.label).toBe('COPY LINK')
    expect(hook.current.status).toBe('idle')

    await act(async () => {
      await hook.current.copy()
    })
    expect(written).toEqual([SHARE.url])
    expect(hook.current.label).toBe('COPIED')
    expect(hook.current.message).toBe('LINK COPIED')

    // The confirmation is a timed state, not a permanent one: a reader who
    // copies again later must be offered a copy, not told it is already done.
    const expired = Promise.withResolvers<void>()
    setTimeout(expired.resolve, 2100)
    await act(async () => {
      await expired.promise
    })
    expect(hook.current.label).toBe('COPY LINK')
    expect(hook.current.status).toBe('idle')

    await hook.unmount()
  })

  test('never claims a copy that was rejected', async () => {
    const hook = await mountCopyHook(SHARE.url, () => Promise.reject(new Error('denied')))

    await hook.render()
    await act(async () => {
      await hook.current.copy()
    })
    expect(hook.current.label).toBe('COPY LINK')
    expect(hook.current.status).toBe('failed')
    expect(hook.current.message).toBe('COPY FAILED — USE THE LINK ABOVE')

    await hook.unmount()
  })

  test('stays idle when no clipboard is available', async () => {
    // The clipboard API needs a secure context; on an insecure origin the hook
    // must not fabricate a confirmation the browser never performed.
    const hook = await mountCopyHook(SHARE.url, 'absent')
    await hook.render()

    await act(async () => {
      await hook.current.copy()
    })
    expect(hook.current.status).toBe('idle')
    expect(hook.current.message).toBe('')

    await hook.unmount()
  })
})
