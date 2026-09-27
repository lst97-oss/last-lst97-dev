import { hasTrustedCloudflareOrigin } from './cloudflare-origin'

const encoder = new TextEncoder()

export async function clientKeyFromRequest(
  request: Request,
  secret: string,
  production: boolean,
  cloudflareOriginVerifySecret?: string,
): Promise<string> {
  if (secret.trim().length < 32) throw new Error('Rate limit hash secret must be at least 32 characters')
  if (production && !hasTrustedCloudflareOrigin(request, cloudflareOriginVerifySecret)) {
    throw new Error('Trusted Cloudflare ingress could not be verified')
  }
  const address = production ? request.headers.get('cf-connecting-ip')?.trim() : 'local-development-client'
  if (!address || address.length > 64 || /[\r\n,]/.test(address)) {
    throw new Error('Trusted client address is unavailable')
  }
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(address)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
