import { getServerEnv } from '../env'

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

// Comments are optional. Until the site key and its secret API key are set, the
// Payload hooks do nothing and the detail pages render no thread.
export function commentsConfig(): CommentsConfig | null {
  const env = getServerEnv()
  if (!env.COMMENTS_SITE_KEY || !env.COMMENTS_API_KEY) return null
  return {
    baseUrl: env.COMMENTS_BASE_URL.replace(/\/+$/, ''),
    siteKey: env.COMMENTS_SITE_KEY,
    apiKey: env.COMMENTS_API_KEY,
  }
}

export function commentsPublicConfig(): CommentsPublicConfig | null {
  const env = getServerEnv()
  if (!env.COMMENTS_SITE_KEY) return null
  return {
    baseUrl: env.COMMENTS_BASE_URL.replace(/\/+$/, ''),
    siteKey: env.COMMENTS_SITE_KEY,
    turnstileSiteKey: env.COMMENTS_TURNSTILE_SITE_KEY ?? null,
  }
}
