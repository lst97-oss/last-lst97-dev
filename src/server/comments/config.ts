import { getServerEnv, type ServerEnv } from '../env'
import { COMMENTS_PROXY_PREFIX } from './proxy'

// Server-side comments settings. The API key is a secret: it stays on the server
// and only the public subset below may reach the browser.
export type CommentsConfig = {
  baseUrl: string
  siteKey: string
  apiKey: string
}

export type CommentsPublicConfig = {
  baseUrl: string
  siteKey: string
  turnstileSiteKey: string | null
}

export type CommentsProxyConfig = {
  baseUrl: string
  siteKey: string
  apiKey: string
}

type CommentsEnv = Pick<
  ServerEnv,
  | 'COMMENTS_API_KEY'
  | 'COMMENTS_BASE_URL'
  | 'COMMENTS_PROXY_API_KEY'
  | 'COMMENTS_SITE_KEY'
  | 'COMMENTS_TURNSTILE_SITE_KEY'
>

function trimmedBaseUrl(env: CommentsEnv): string {
  return env.COMMENTS_BASE_URL.replace(/\/+$/, '')
}

// Comments are optional. Until the site key and its secret API key are set, the
// Payload hooks do nothing and the detail pages render no thread.
export function commentsConfigFrom(env: CommentsEnv): CommentsConfig | null {
  if (!env.COMMENTS_SITE_KEY || !env.COMMENTS_API_KEY) return null
  return { baseUrl: trimmedBaseUrl(env), siteKey: env.COMMENTS_SITE_KEY, apiKey: env.COMMENTS_API_KEY }
}

// The key the host's proxy holds. It is separate from COMMENTS_API_KEY, which
// can register pages, so a leak in the request path cannot delete or create threads.
export function commentsProxyConfigFrom(env: CommentsEnv): CommentsProxyConfig | null {
  if (!env.COMMENTS_SITE_KEY || !env.COMMENTS_PROXY_API_KEY) return null
  return { baseUrl: trimmedBaseUrl(env), siteKey: env.COMMENTS_SITE_KEY, apiKey: env.COMMENTS_PROXY_API_KEY }
}

// With the proxy on, the browser calls this host (a relative baseUrl), so the
// comments service's origin never reaches the page. The public config is
// server-cached, so the value must not depend on the request's origin.
export function commentsPublicConfigFrom(env: CommentsEnv): CommentsPublicConfig | null {
  if (!env.COMMENTS_SITE_KEY) return null
  return {
    baseUrl: env.COMMENTS_PROXY_API_KEY ? COMMENTS_PROXY_PREFIX : trimmedBaseUrl(env),
    siteKey: env.COMMENTS_SITE_KEY,
    turnstileSiteKey: env.COMMENTS_TURNSTILE_SITE_KEY ?? null,
  }
}

export function commentsConfig(): CommentsConfig | null {
  return commentsConfigFrom(getServerEnv())
}

export function commentsProxyConfig(): CommentsProxyConfig | null {
  return commentsProxyConfigFrom(getServerEnv())
}

export function commentsPublicConfig(): CommentsPublicConfig | null {
  return commentsPublicConfigFrom(getServerEnv())
}
