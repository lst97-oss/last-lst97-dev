import { isIP } from 'node:net'

// On Vercel the platform overwrites x-forwarded-for. Anywhere else only the header the operator names is
// trusted. Either way the value must be exactly one IP: a comma-chained or padded value fails closed.
export function vercelClientIpFromRequest(
  request: Request,
  vercelRuntime: boolean,
  trustedHeader?: string,
): string | undefined {
  const header = vercelRuntime ? 'x-forwarded-for' : trustedHeader
  if (!header) return undefined

  const address = request.headers.get(header)
  if (!address || address !== address.trim() || address.length > 45 || address.includes(',')) {
    return undefined
  }

  return isIP(address) > 0 ? address : undefined
}
