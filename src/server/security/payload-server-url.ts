/**
 * Resolves the canonical origin Payload uses for `serverURL`.
 *
 * `serverURL` is security-relevant, not cosmetic: Payload derives the admin
 * cookie's `Secure`/`SameSite` attributes and its CORS origin allow-list from
 * it. A localhost or http value in production breaks admin sign-in and makes
 * every origin look trusted, so this fails loudly at boot instead.
 */

export interface PayloadServerUrlEnv {
  PAYLOAD_PUBLIC_SERVER_URL?: string | null
  PUBLIC_SITE_URL?: string | null
  NODE_ENV?: string | null
}

export const LOCALHOST_URL = 'http://localhost:3000'

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  )
}

export class PayloadServerUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PayloadServerUrlError'
  }
}

/**
 * Resolves and validates the Payload origin.
 *
 * Order of preference: `PAYLOAD_PUBLIC_SERVER_URL`, then `PUBLIC_SITE_URL`
 * (the same origin the SEO canonical links use, so the two cannot drift), then
 * localhost in development. In production a missing, loopback, or non-https
 * origin throws rather than silently degrading admin security.
 */
export function resolvePayloadServerUrl(env: PayloadServerUrlEnv): string {
  const isProduction = env.NODE_ENV === 'production'
  const candidate = (env.PAYLOAD_PUBLIC_SERVER_URL ?? env.PUBLIC_SITE_URL ?? '').trim()
  const value = candidate || LOCALHOST_URL

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new PayloadServerUrlError(
      'PAYLOAD_PUBLIC_SERVER_URL must be an absolute URL (for example https://example.com).',
    )
  }

  if (isProduction) {
    if (isLoopbackHost(url.hostname)) {
      throw new PayloadServerUrlError(
        'PAYLOAD_PUBLIC_SERVER_URL must be the public production origin, not a loopback address. ' +
          'Payload derives admin cookie security and CORS from this value.',
      )
    }
    if (url.protocol !== 'https:') {
      throw new PayloadServerUrlError('PAYLOAD_PUBLIC_SERVER_URL must use https in production.')
    }
  }

  return url.origin
}
