import { HttpHeader, HttpMethod, HttpStatus, MediaType } from '@lst97-oss/last-httprism'
import { z } from 'zod'

import { readJsonBody } from '../http/request'

// The widget builds every URL as `${baseUrl}/api/...`. With baseUrl set to this
// prefix, the path after it is the comments-service path the widget expects.
export const COMMENTS_PROXY_PREFIX = '/api/site/comments'
// The public policy is the same for every visitor and safe to share at the edge for a minute.
// Must match the exact-path route rule in vite.config.ts.
export const COMMENTS_SETTINGS_CACHE_CONTROL = 'public, max-age=0, s-maxage=60'

const MAX_BODY_BYTES = 16 * 1024
const MAX_BODY_CHARACTERS = 10_000
const MAX_PAGE_URL_LENGTH = 2048
const DEFAULT_TIMEOUT_MS = 8_000
const COMMENT_ID = /^[A-Za-z0-9_-]{1,64}$/
// A guest's edit key, as the widget sends it on delete. The service accepts up to 128 characters.
const EDIT_KEY_HEADER = 'x-lc-edit-key'
const EDIT_KEY = /^[A-Za-z0-9_-]{1,128}$/
// `/api/comments/vote` and `/api/comments/settings` match the comment-id shape but are different endpoints.
const RESERVED_SEGMENTS = new Set(['vote', 'settings'])

export type ProxyOperation = 'session' | 'settings' | 'list' | 'create' | 'edit' | 'delete'
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
  return Response.json({ error: { code, message } }, { status, headers: { [HttpHeader.CACHE_CONTROL]: 'no-store' } })
}

// Only the routes the widget calls. Anything else (vote, moderation, sign-in,
// admin) is refused here, so the key cannot reach endpoints it does not need.
export function classifyCommentsRoute(
  method: string,
  path: string,
): { operation: ProxyOperation; commentId: string | null } | null {
  if (method === HttpMethod.GET && path === '/api/auth/get-session') return { operation: 'session', commentId: null }
  if (method === HttpMethod.GET && path === '/api/comments/settings') return { operation: 'settings', commentId: null }
  if (path === '/api/comments') {
    if (method === HttpMethod.GET) return { operation: 'list', commentId: null }
    if (method === HttpMethod.POST) return { operation: 'create', commentId: null }
    return null
  }
  const match = /^\/api\/comments\/([^/]+)$/.exec(path)
  const commentId = match?.[1]
  if (!commentId || !COMMENT_ID.test(commentId) || RESERVED_SEGMENTS.has(commentId)) return null
  if (method === HttpMethod.PATCH) return { operation: 'edit', commentId }
  if (method === HttpMethod.DELETE) return { operation: 'delete', commentId }
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
  return (request.headers.get(HttpHeader.CONTENT_TYPE) ?? '').toLowerCase().startsWith(MediaType.JSON)
}

const invalid = () =>
  commentsErrorResponse(HttpStatus.BAD_REQUEST.code, 'VALIDATION_ERROR', 'Check the comment and try again')
const unavailable = () =>
  commentsErrorResponse(
    HttpStatus.SERVICE_UNAVAILABLE.code,
    'COMMENTS_UNAVAILABLE',
    'Comments are temporarily unavailable',
  )

export async function proxyCommentsRequest(request: Request, deps: CommentsProxyDependencies): Promise<Response> {
  const route = classifyCommentsRoute(request.method, commentsPathOf(request.url))
  if (!route) return commentsErrorResponse(HttpStatus.NOT_FOUND.code, 'NOT_FOUND', 'Not found')
  if (route.operation === 'session') {
    // No session is ever forwarded, so the visitor is always a guest here.
    return Response.json(null, { headers: { [HttpHeader.CACHE_CONTROL]: 'no-store' } })
  }

  const { operation, commentId } = route
  const schemas = schemasFor(deps.siteOrigin)
  if (isWriteOperation(operation)) {
    // Browsers send Origin on every same-origin POST/PATCH/DELETE, and a
    // cross-site form cannot set application/json without a preflight we never answer.
    if (request.headers.get(HttpHeader.ORIGIN) !== deps.siteOrigin) {
      return commentsErrorResponse(
        HttpStatus.FORBIDDEN.code,
        'ORIGIN_NOT_ALLOWED',
        'Comments can only be posted from this site',
      )
    }
    if (operation !== 'delete' && !isJsonRequest(request)) {
      return commentsErrorResponse(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE.code,
        'VALIDATION_ERROR',
        'Send the comment as JSON',
      )
    }
  }

  // The guest's edit key rides a header on delete only, and a malformed one never reaches the service.
  let editKey: string | null = null
  if (operation === 'delete') {
    const raw = request.headers.get(EDIT_KEY_HEADER)
    if (raw !== null) {
      if (!EDIT_KEY.test(raw)) {
        return commentsErrorResponse(HttpStatus.BAD_REQUEST.code, 'VALIDATION_ERROR', 'The edit key is not valid')
      }
      editKey = raw
    }
  }

  let body: Record<string, unknown> | undefined
  if (operation === 'create' || operation === 'edit') {
    const read = await readJsonBody(request, MAX_BODY_BYTES)
    if (!read.ok) {
      return read.reason === 'too_large'
        ? commentsErrorResponse(HttpStatus.CONTENT_TOO_LARGE.code, 'VALIDATION_ERROR', 'The comment is too large')
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
  const headers: Record<string, string> = { 'x-api-key': upstream.apiKey, [HttpHeader.ACCEPT]: MediaType.JSON }
  if (isWriteOperation(operation)) {
    try {
      headers['x-lc-client'] = await deps.clientId(request)
    } catch {
      return unavailable()
    }
  }

  // The upstream request is rebuilt from scratch: no cookie, authorization or origin header reaches the service.
  const json = { [HttpHeader.CONTENT_TYPE]: MediaType.JSON }
  let target: { url: string; init: RequestInit }
  switch (operation) {
    case 'list': {
      const params = new URLSearchParams({ site, url: query.url ?? '' })
      if (query.limit !== undefined) params.set('limit', query.limit)
      if (query.offset !== undefined) params.set('offset', query.offset)
      target = { url: `${upstream.baseUrl}/api/comments?${params}`, init: { method: HttpMethod.GET, headers } }
      break
    }
    case 'create':
      target = {
        url: `${upstream.baseUrl}/api/comments`,
        init: { method: HttpMethod.POST, headers: { ...headers, ...json }, body: JSON.stringify({ site, ...body }) },
      }
      break
    case 'edit':
      target = {
        url: `${upstream.baseUrl}/api/comments/${commentId}`,
        init: { method: HttpMethod.PATCH, headers: { ...headers, ...json }, body: JSON.stringify({ site, ...body }) },
      }
      break
    case 'settings':
      // Public and the same for every visitor: no key and no client identity reach the service.
      target = {
        url: `${upstream.baseUrl}/api/comments/settings?${new URLSearchParams({ site })}`,
        init: { method: HttpMethod.GET, headers: { [HttpHeader.ACCEPT]: MediaType.JSON } },
      }
      break
    case 'delete':
      target = {
        url: `${upstream.baseUrl}/api/comments/${commentId}?${new URLSearchParams({ site })}`,
        init: {
          method: HttpMethod.DELETE,
          headers: editKey === null ? headers : { ...headers, [EDIT_KEY_HEADER]: editKey },
        },
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
    if (!(response.headers.get(HttpHeader.CONTENT_TYPE) ?? '').includes(MediaType.JSON)) {
      console.error('[comments-proxy] upstream returned non-JSON', {
        baseUrl: upstream.baseUrl,
        status: response.status,
        contentType: response.headers.get(HttpHeader.CONTENT_TYPE),
        body: (await response.text()).slice(0, 200),
      })
      return unavailable()
    }
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        [HttpHeader.CONTENT_TYPE]: `${MediaType.JSON}; charset=utf-8`,
        [HttpHeader.CACHE_CONTROL]: operation === 'settings' ? COMMENTS_SETTINGS_CACHE_CONTROL : 'no-store',
      },
    })
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined
    const code =
      cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string' ? cause.code : undefined
    console.error('[comments-proxy] upstream request failed', {
      baseUrl: upstream.baseUrl,
      message: error instanceof Error ? error.message : String(error),
      code,
    })
    return unavailable()
  }
}
