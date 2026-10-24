import { describe, expect, it } from 'bun:test'
import { deleteCommentThread, registerCommentThread } from '../../src/server/comments/thread'

const config = { baseUrl: 'https://comments.test', siteKey: 'lst97-dev', apiKey: 'lck_test_secret' }
const thread = { url: 'https://www.lst97.dev/blog/a-note', pageKey: 'posts-7', title: 'A note' }

describe('registerCommentThread', () => {
  it('posts the page to the admin pages endpoint with the site key and the secret in x-api-key', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return Response.json({ data: { page: {} } })
    }

    const result = await registerCommentThread(config, thread, fetcher)

    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://comments.test/api/admin/pages')
    expect(calls[0]?.init.method).toBe('POST')
    expect(new Headers(calls[0]?.init.headers).get('x-api-key')).toBe('lck_test_secret')
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      site: 'lst97-dev',
      url: 'https://www.lst97.dev/blog/a-note',
      pageKey: 'posts-7',
      title: 'A note',
    })
  })

  it('reports an HTTP failure instead of throwing', async () => {
    const fetcher = async () => Response.json({ error: { code: 'INSUFFICIENT_SCOPE' } }, { status: 403 })
    expect(await registerCommentThread(config, thread, fetcher)).toEqual({ ok: false, reason: 'http_403' })
  })

  it('reports a network failure instead of throwing', async () => {
    const fetcher = async (): Promise<Response> => {
      throw new TypeError('fetch failed')
    }
    expect(await registerCommentThread(config, thread, fetcher)).toEqual({ ok: false, reason: 'TypeError' })
  })
})

describe('deleteCommentThread', () => {
  it('deletes the thread by site and pageKey, authenticated with the secret', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return Response.json({ data: { deleted: true } })
    }

    expect(await deleteCommentThread(config, 'posts-7', fetcher)).toEqual({ ok: true })
    expect(calls[0]?.url).toBe('https://comments.test/api/admin/pages?site=lst97-dev&pageKey=posts-7')
    expect(calls[0]?.init.method).toBe('DELETE')
    expect(new Headers(calls[0]?.init.headers).get('x-api-key')).toBe('lck_test_secret')
  })

  it('treats the service PAGE_NOT_FOUND as already deleted', async () => {
    const fetcher = async () => Response.json({ error: { code: 'PAGE_NOT_FOUND' } }, { status: 404 })
    expect(await deleteCommentThread(config, 'posts-7', fetcher)).toEqual({ ok: true })
  })

  it('keeps any other 404 a failure, so a route the server does not serve yet is not reported as deleted', async () => {
    const fetcher = async () => new Response('not found', { status: 404 })
    expect(await deleteCommentThread(config, 'posts-7', fetcher)).toEqual({ ok: false, reason: 'http_404' })
  })

  it('reports a network failure instead of throwing', async () => {
    const fetcher = async (): Promise<Response> => {
      throw new TypeError('fetch failed')
    }
    expect(await deleteCommentThread(config, 'posts-7', fetcher)).toEqual({ ok: false, reason: 'TypeError' })
  })
})
