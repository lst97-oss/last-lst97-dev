import { vercelClientIpFromRequest } from './vercel-client-ip'

const encoder = new TextEncoder()

export async function clientKeyFromRequest(
  request: Request,
  secret: string,
  production: boolean,
  vercelRuntime: boolean,
): Promise<string> {
  if (secret.trim().length < 32) throw new Error('Rate limit hash secret must be at least 32 characters')
  const address = production ? vercelClientIpFromRequest(request, vercelRuntime) : 'local-development-client'
  if (!address) {
    throw new Error('Trusted client address is unavailable')
  }
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(address)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
