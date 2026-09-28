import { isIP } from 'node:net'

export function vercelClientIpFromRequest(request: Request, vercelRuntime: boolean): string | undefined {
  if (!vercelRuntime) return undefined

  const address = request.headers.get('x-forwarded-for')
  if (!address || address !== address.trim() || address.length > 45 || address.includes(',')) {
    return undefined
  }

  return isIP(address) > 0 ? address : undefined
}
