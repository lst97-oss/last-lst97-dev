import { vercelClientIpFromRequest } from './vercel-client-ip'

const encoder = new TextEncoder()

// The key depends only on the secret, so import it once instead of on every request.
let cachedKey: { secret: string; key: Promise<CryptoKey> } | undefined

function hmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret === secret) return cachedKey.key
  const key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  cachedKey = { secret, key }
  // A failed import must not stay cached, or every later request would fail until restart.
  key.catch(() => {
    if (cachedKey?.key === key) cachedKey = undefined
  })
  return key
}

export async function clientKeyFromRequest(
  request: Request,
  secret: string,
  production: boolean,
  vercelRuntime: boolean,
  trustedHeader?: string,
): Promise<string> {
  if (secret.trim().length < 32) throw new Error('Rate limit hash secret must be at least 32 characters')
  const address = production
    ? vercelClientIpFromRequest(request, vercelRuntime, trustedHeader)
    : 'local-development-client'
  if (!address) {
    throw new Error('Trusted client address is unavailable')
  }
  const key = await hmacKey(secret)
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(address)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
