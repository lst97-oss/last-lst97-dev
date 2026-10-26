import { getServerEnv, type ServerEnv } from '../env'

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
}

type CommentsEnv = Pick<
  ServerEnv,
  'COMMENTS_API_KEY' | 'COMMENTS_BASE_URL' | 'COMMENTS_PUBLIC_URL' | 'COMMENTS_SITE_KEY'
>

function trimmedBaseUrl(env: CommentsEnv): string {
  return env.COMMENTS_BASE_URL.replace(/\/+$/, '')
}

// One key does the host's server-side comment work: it registers and removes page
// threads (pages:write, pages:delete). The browser never receives it; visitor
// reads, writes, votes and sign-in go directly to the comments service, whose CORS
// allow-list carries this site's registered origin.
export function commentsConfigFrom(env: CommentsEnv): CommentsConfig | null {
  if (!env.COMMENTS_SITE_KEY || !env.COMMENTS_API_KEY || !env.COMMENTS_BASE_URL) return null
  return { baseUrl: trimmedBaseUrl(env), siteKey: env.COMMENTS_SITE_KEY, apiKey: env.COMMENTS_API_KEY }
}

// The browser calls the comments service directly. Its CORS allow-list echoes
// this site's registered origin, so reads, writes and the built-in auth flow
// stay cross-origin but credentialed; the API key never leaves the server.
export function commentsPublicConfigFrom(env: CommentsEnv): CommentsPublicConfig | null {
  const config = commentsConfigFrom(env)
  if (!config) return null
  return {
    baseUrl: env.COMMENTS_PUBLIC_URL.replace(/\/+$/, ''),
    siteKey: config.siteKey,
  }
}

export function commentsConfig(): CommentsConfig | null {
  return commentsConfigFrom(getServerEnv())
}

export function commentsPublicConfig(): CommentsPublicConfig | null {
  return commentsPublicConfigFrom(getServerEnv())
}
