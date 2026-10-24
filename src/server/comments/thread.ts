import type { CommentsConfig } from './config'

export type ThreadRegistration = {
  url: string
  pageKey: string
  title?: string
}

export type RegisterResult = { ok: true } | { ok: false; reason: string }

// The one fetch signature this client uses; `typeof fetch` would also demand
// `preconnect`, which a test fake has no reason to provide.
export type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

const REGISTER_TIMEOUT_MS = 5_000

// Registers a content page with the comments service, so its thread follows the
// content across slug changes (the pageKey stays put while the URL moves). It
// never throws: a comments outage must not fail a Payload save.
export async function registerCommentThread(
  config: CommentsConfig,
  thread: ThreadRegistration,
  fetcher: Fetcher = fetch,
): Promise<RegisterResult> {
  try {
    const response = await fetcher(`${config.baseUrl}/api/admin/pages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': config.apiKey },
      body: JSON.stringify({ site: config.siteKey, ...thread }),
      signal: AbortSignal.timeout(REGISTER_TIMEOUT_MS),
    })
    if (response.ok) return { ok: true }
    return { ok: false, reason: `http_${response.status}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : 'unknown_error' }
  }
}

// Deletes a page's thread, addressed by the same pageKey the registration used.
// A thread the service does not know is already gone, so only the service's own
// PAGE_NOT_FOUND counts as deleted. Any other 404 (for example a route the server
// does not serve yet) stays a failure. Never throws.
export async function deleteCommentThread(
  config: CommentsConfig,
  pageKey: string,
  fetcher: Fetcher = fetch,
): Promise<RegisterResult> {
  try {
    const query = new URLSearchParams({ site: config.siteKey, pageKey })
    const response = await fetcher(`${config.baseUrl}/api/admin/pages?${query}`, {
      method: 'DELETE',
      headers: { 'x-api-key': config.apiKey },
      signal: AbortSignal.timeout(REGISTER_TIMEOUT_MS),
    })
    if (response.ok) return { ok: true }
    const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null
    if (response.status === 404 && body?.error?.code === 'PAGE_NOT_FOUND') return { ok: true }
    return { ok: false, reason: `http_${response.status}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : 'unknown_error' }
  }
}
