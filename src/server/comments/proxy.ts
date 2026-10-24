import { z } from 'zod'

import { readJsonBody } from '../http/request'

// The widget builds every URL as `${baseUrl}/api/...`. With baseUrl set to this
// prefix, the path after it is the comments-service path the widget expects.
export const COMMENTS_PROXY_PREFIX = '/api/site/comments'

const MAX_BODY_BYTES = 16 * 1024
const MAX_BODY_CHARACTERS = 10_000
const MAX_PAGE_URL_LENGTH = 2048
const DEFAULT_TIMEOUT_MS = 8_000
const COMMENT_ID = /^[A-Za-z0-9_-]{1,64}$/
// `/api/comments/vote` matches the comment-id shape but is a different endpoint.
const RESERVED_SEGMENTS = new Set(['vote'])

export type ProxyOperation = 'session' | 'list' | 'create' | 'edit' | 'delete'
export type ProxyDecision = { allow: true } | { allow: false; status: number; code: string; message: string }

export interface ProxyUpstream {
  baseUrl: string
  siteKey: string
  apiKey: string
}

export interface CommentsProxyDependencies {
  upstream: ProxyUpstream
  // Origin of the host's pages. Writes must come from it, and every page URL
  // must belong to it, because the proxy's key bypasses the comments service's
  // Origin check.
  siteOrigin: string
  // Stable per-visitor id for the comments service's rate limit. Only writes ask for it.
  clientId(request: Request): Promise<string>
  // Whitelist and blacklist seam. The default allows every proxied request.
  authorize?(input: { operation: ProxyOperation; request: Request }): Promise<ProxyDecision>
  fetcher?: typeof fetch
  timeoutMs?: number
}

export function commentsErrorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store' } })
}

// Only the routes the widget calls. Anything else (vote, moderation, sign-in,
// admin) is refused here, so the key cannot reach endpoints it does not need.
export function classifyCommentsRoute(
  method: string,
  path: string,
): { operation: ProxyOperation; commentId: string | null } | null {
  if (method === 'GET' && path === '/api/auth/get-session') return { operation: 'session', commentId: null }
  if (path === '/api/comments') {
    if (method === 'GET') return { operation: 'list', commentId: null }
    if (method === 'POST') return { operation: 'create', commentId: null }
    return null
  }
  const match = /^\/api\/comments\/([^/]+)$/.exec(path)
  const commentId = match?.[1]
  if (!commentId || !COMMENT_ID.test(commentId) || RESERVED_SEGMENTS.has(commentId)) return null
  if (method === 'PATCH') return { operation: 'edit', commentId }
  if (method === 'DELETE') return { operation: 'delete', commentId }
  return null
}

export function isWriteOperation(operation: ProxyOperation): boolean {
  return operation === 'create' || operation === 'edit' || operation === 'delete'
}

// The path after the prefix, e.g. `/api/comments/abc`, from the request URL.
export function commentsPathOf(requestUrl: string): string {
  const { pathname } = new URL(requestUrl)
  return pathname.startsWith(COMMENTS_PROXY_PREFIX) ? pathname.slice(COMMENTS_PROXY_PREFIX.length) : pathname
}

function isUrlOnSite(value: string, siteOrigin: string): boolean {
  try {
    return new URL(value).origin === siteOrigin
  } catch {
    return false
  }
}

function schemasFor(siteOrigin: string) {
  const pageUrl = z
    .string()
    .max(MAX_PAGE_URL_LENGTH)
    .refine((value) => isUrlOnSite(value, siteOrigin), 'Comments are only available on this site')
  // z.object strips unknown keys, such as the `site` the widget sends, so the
  // upstream body is built only from fields named here.
  return {
    list: z.object({
      url: pageUrl,
      limit: z
        .string()
        .regex(/^\d{1,3}$/)
        .optional(),
      offset: z
        .string()
        .regex(/^\d{1,6}$/)
        .optional(),
    }),
    create: z.object({
      url: pageUrl,
      title: z.string().max(200).optional(),
      parentId: z.string().min(1).max(64).optional(),
      authorName: z.string().max(80).optional(),
      bodyMarkdown: z.string().max(MAX_BODY_CHARACTERS),
      verificationToken: z.string().min(1).max(4096).optional(),
    }),
    edit: z.object({
      bodyMarkdown: z.string().max(MAX_BODY_CHARACTERS),
      editKey: z.string().min(1).max(256).optional(),
    }),
  }
}

function isJsonRequest(request: Request): boolean {
  return (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')
}

const invalid = () => commentsErrorResponse(400, 'VALIDATION_ERROR', 'Check the comment and try again')
const unavailable = () => commentsErrorResponse(503, 'COMMENTS_UNAVAILABLE', 'Comments are temporarily unavailable')

export async function proxyCommentsRequest(request: Request, deps: CommentsProxyDependencies): Promise<Response> {
  const route = classifyCommentsRoute(request.method, commentsPathOf(request.url))
  if (!route) return commentsErrorResponse(404, 'NOT_FOUND', 'Not found')
  if (route.operation === 'session') {
    // No session is ever forwarded, so the visitor is always a guest here.
    return Response.json(null, { headers: { 'cache-control': 'no-store' } })
  }

  const { operation, commentId } = route
  const schemas = schemasFor(deps.siteOrigin)
  if (isWriteOperation(operation)) {
    // Browsers send Origin on every same-origin POST/PATCH/DELETE, and a
    // cross-site form cannot set application/json without a preflight we never answer.
    if (request.headers.get('origin') !== deps.siteOrigin) {
      return commentsErrorResponse(403, 'ORIGIN_NOT_ALLOWED', 'Comments can only be posted from this site')
    }
    if (operation !== 'delete' && !isJsonRequest(request)) {
      return commentsErrorResponse(415, 'VALIDATION_ERROR', 'Send the comment as JSON')
    }
  }

  let body: Record<string, unknown> | undefined
  if (operation === 'create' || operation === 'edit') {
    const read = await readJsonBody(request, MAX_BODY_BYTES)
    if (!read.ok) {
      return read.reason === 'too_large'
        ? commentsErrorResponse(413, 'VALIDATION_ERROR', 'The comment is too large')
        : invalid()
    }
    const parsed = schemas[operation].safeParse(read.value)
    if (!parsed.success) return invalid()
    body = parsed.data
  }

  let query: { url?: string; limit?: string; offset?: string } = {}
  if (operation === 'list') {
    const parsed = schemas.list.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return invalid()
    query = parsed.data
  }

  const authorization = await (deps.authorize?.({ operation, request }) ?? Promise.resolve({ allow: true as const }))
  if (!authorization.allow) {
    return commentsErrorResponse(authorization.status, authorization.code, authorization.message)
  }

  // Writes carry the visitor's rate-limit identity; reads never need it, so a
  // host without a usable client address can still show comments.
  const { upstream } = deps
  const site = upstream.siteKey
  const headers: Record<string, string> = { 'x-api-key': upstream.apiKey, accept: 'application/json' }
  if (isWriteOperation(operation)) {
    try {
      headers['x-lc-client'] = await deps.clientId(request)
    } catch {
      return unavailable()
    }
  }

  // The upstream request is rebuilt from scratch: no cookie, authorization or origin header reaches the service.
  const json = { 'content-type': 'application/json' }
  let target: { url: string; init: RequestInit }
  switch (operation) {
    case 'list': {
      const params = new URLSearchParams({ site, url: query.url ?? '' })
      if (query.limit !== undefined) params.set('limit', query.limit)
      if (query.offset !== undefined) params.set('offset', query.offset)
      target = { url: `${upstream.baseUrl}/api/comments?${params}`, init: { method: 'GET', headers } }
      break
    }
    case 'create':
      target = {
        url: `${upstream.baseUrl}/api/comments`,
        init: { method: 'POST', headers: { ...headers, ...json }, body: JSON.stringify({ site, ...body }) },
      }
      break
    case 'edit':
      target = {
        url: `${upstream.baseUrl}/api/comments/${commentId}`,
        init: { method: 'PATCH', headers: { ...headers, ...json }, body: JSON.stringify({ site, ...body }) },
      }
      break
    case 'delete':
      target = {
        url: `${upstream.baseUrl}/api/comments/${commentId}?${new URLSearchParams({ site })}`,
        init: { method: 'DELETE', headers },
      }
      break
  }
  const { url, init } = target

  try {
    const response = await (deps.fetcher ?? fetch)(url, {
      ...init,
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    })
    // Anything but the service's JSON envelope (an HTML error page, say) is a
    // failure of ours, not something to show a visitor.
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) return unavailable()
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch {
    return unavailable()
  }
}
