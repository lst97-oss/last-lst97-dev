const URL_BASE = 'https://last-os.invalid'
const SAFE_CONTENT_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SAFE_ASSET_PROTOCOLS = new Set(['http:', 'https:'])

function parseSafeURL(value: unknown): { href: string; protocol: string } | null {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null

  try {
    return { href, protocol: new URL(href, URL_BASE).protocol }
  } catch {
    return null
  }
}

export function safeContentHref(value: unknown): string | null {
  const parsed = parseSafeURL(value)
  return parsed && SAFE_CONTENT_PROTOCOLS.has(parsed.protocol) ? parsed.href : null
}

export function safeAssetHref(value: unknown): string | null {
  const parsed = parseSafeURL(value)
  return parsed && SAFE_ASSET_PROTOCOLS.has(parsed.protocol) ? parsed.href : null
}
