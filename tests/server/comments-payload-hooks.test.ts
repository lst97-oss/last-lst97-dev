import { describe, expect, it } from 'bun:test'
import { Changelogs } from '../../src/collections/Changelogs'
import { Posts } from '../../src/collections/Posts'
import { Projects } from '../../src/collections/Projects'
import {
  type CommentsHookDeps,
  createCommentsAfterChangeHook,
  createCommentsAfterDeleteHook,
  isPubliclyVisible,
  needsThreadRegistration,
} from '../../src/server/comments/payload-hooks'

const now = new Date('2026-10-23T00:00:00.000Z')
const config = { baseUrl: 'https://comments.test', siteKey: 'lst97-dev', apiKey: 'lck_test_secret' }

const published = {
  id: 7,
  status: 'published',
  slug: 'a-note',
  title: 'A note',
  publishedAt: '2026-10-01T00:00:00.000Z',
}

type Call = { url: string; body: Record<string, unknown> }

function fakeDeps(overrides: Partial<CommentsHookDeps> = {}) {
  const calls: Call[] = []
  const warnings: { event: string; fields: Record<string, unknown> }[] = []
  const deps: CommentsHookDeps = {
    readConfig: () => config,
    readSiteOrigin: () => 'https://www.lst97.dev',
    fetcher: async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null })
      return Response.json({ data: { page: {} } })
    },
    now: () => now,
    warn: (event, fields) => warnings.push({ event, fields }),
    ...overrides,
  }
  return { deps, calls, warnings }
}

function run(hook: ReturnType<typeof createCommentsAfterChangeHook>, doc: object, previousDoc?: object) {
  return hook({ doc, previousDoc, req: {} } as unknown as Parameters<typeof hook>[0])
}

describe('isPubliclyVisible', () => {
  it('is public only when published, with a slug, and its date has arrived', () => {
    expect(isPubliclyVisible(published, now)).toBe(true)
    expect(isPubliclyVisible({ ...published, status: 'draft' }, now)).toBe(false)
    expect(isPubliclyVisible({ ...published, slug: '' }, now)).toBe(false)
    expect(isPubliclyVisible({ ...published, publishedAt: '2026-11-01T00:00:00.000Z' }, now)).toBe(false)
    expect(isPubliclyVisible({ ...published, publishedAt: null }, now)).toBe(false)
  })

  it('accepts a Date from Payload as well as an ISO string', () => {
    expect(isPubliclyVisible({ ...published, publishedAt: new Date('2026-10-01T00:00:00.000Z') }, now)).toBe(true)
  })
})

describe('needsThreadRegistration', () => {
  it('registers a page that becomes public', () => {
    expect(needsThreadRegistration(published, { ...published, status: 'draft' }, now)).toBe(true)
    expect(needsThreadRegistration(published, undefined, now)).toBe(true)
  })

  it('registers again when the slug or title of a public page changes', () => {
    expect(needsThreadRegistration({ ...published, slug: 'renamed' }, published, now)).toBe(true)
    expect(needsThreadRegistration({ ...published, title: 'Renamed' }, published, now)).toBe(true)
  })

  it('leaves the thread alone for other saves and for drafts', () => {
    expect(needsThreadRegistration({ ...published, excerpt: 'edited body' }, published, now)).toBe(false)
    expect(needsThreadRegistration({ ...published, status: 'draft' }, published, now)).toBe(false)
  })
})

describe('createCommentsAfterChangeHook', () => {
  it('registers the thread with a pageKey that survives slug changes', async () => {
    const { deps, calls } = fakeDeps()
    await run(createCommentsAfterChangeHook('posts', deps), published, { ...published, status: 'draft' })

    expect(calls).toEqual([
      {
        url: 'https://comments.test/api/admin/pages',
        body: {
          site: 'lst97-dev',
          url: 'https://www.lst97.dev/blog/a-note',
          pageKey: 'posts-7',
          title: 'A note',
        },
      },
    ])
  })

  it('does nothing for a draft or an unchanged public page', async () => {
    const { deps, calls } = fakeDeps()
    const hook = createCommentsAfterChangeHook('posts', deps)
    await run(hook, { ...published, status: 'draft' }, published)
    await run(hook, published, published)
    expect(calls).toHaveLength(0)
  })

  it('does nothing when comments are not configured', async () => {
    const { deps, calls } = fakeDeps({ readConfig: () => null })
    await run(createCommentsAfterChangeHook('posts', deps), published)
    expect(calls).toHaveLength(0)
  })

  it('warns and skips when the public site origin is unknown', async () => {
    const { deps, calls, warnings } = fakeDeps({ readSiteOrigin: () => null })
    await run(createCommentsAfterChangeHook('posts', deps), published)
    expect(calls).toHaveLength(0)
    expect(warnings).toEqual([
      { event: 'comments.thread_skipped', fields: { collection: 'posts', id: '7', reason: 'no_site_origin' } },
    ])
  })

  it('logs a failed registration and still returns the saved document', async () => {
    const { deps, warnings } = fakeDeps({
      fetcher: async () => Response.json({}, { status: 500 }),
    })
    const doc = await run(createCommentsAfterChangeHook('posts', deps), published)
    expect(doc).toBe(published)
    expect(warnings).toEqual([
      {
        event: 'comments.thread_register_failed',
        fields: { collection: 'posts', id: '7', reason: 'http_500' },
      },
    ])
  })
})

describe('createCommentsAfterDeleteHook', () => {
  it('deletes the thread by the same pageKey the registration used', async () => {
    const { deps, calls } = fakeDeps()
    const hook = createCommentsAfterDeleteHook('projects', deps)
    await hook({ doc: { id: 9 }, id: 9, req: {} } as unknown as Parameters<typeof hook>[0])

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://comments.test/api/admin/pages?site=lst97-dev&pageKey=projects-9')
  })

  it('does nothing when comments are not configured', async () => {
    const { deps, calls } = fakeDeps({ readConfig: () => null })
    await createCommentsAfterDeleteHook('posts', deps)({ doc: { id: 7 }, id: 7, req: {} } as never)
    expect(calls).toHaveLength(0)
  })

  it('logs a failed delete and still returns the removed document', async () => {
    const { deps, warnings } = fakeDeps({ fetcher: async () => new Response('down', { status: 503 }) })
    const doc = { id: 7 }
    const result = await createCommentsAfterDeleteHook('posts', deps)({ doc, id: 7, req: {} } as never)
    expect(result).toBe(doc)
    expect(warnings).toEqual([
      { event: 'comments.thread_delete_failed', fields: { collection: 'posts', id: '7', reason: 'http_503' } },
    ])
  })
})

describe('content collections', () => {
  it('attach the comment thread hooks beside the existing knowledge hooks', () => {
    expect(Posts.hooks?.afterChange).toHaveLength(2)
    expect(Posts.hooks?.afterDelete).toHaveLength(2)
    expect(Projects.hooks?.afterChange).toHaveLength(2)
    expect(Projects.hooks?.afterDelete).toHaveLength(2)
  })

  it('give changelog entries their first afterChange and afterDelete hooks', () => {
    expect(Changelogs.hooks?.afterChange).toHaveLength(1)
    expect(Changelogs.hooks?.afterDelete).toHaveLength(1)
  })
})
