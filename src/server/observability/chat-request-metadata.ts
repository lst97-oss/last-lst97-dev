import { isValidIpAddress, redactDiagnosticsText, type ChatDiagnosticsMetadata } from './chat-diagnostics'
import { hasTrustedCloudflareOrigin } from '../security/cloudflare-origin'

function safeHeader(request: Request, name: string, maxLength = 120, redact = true): string | undefined {
  const value = request.headers.get(name)?.trim().replace(/[\r\n\u0000-\u001f\u007f]/g, ' ')
  if (!value) return undefined
  const redacted = (redact ? redactDiagnosticsText(value) : value).slice(0, maxLength).trim()
  return redacted || undefined
}

function locationFromRequest(request: Request): ChatDiagnosticsMetadata['location'] {
  const country = safeHeader(request, 'cf-ipcountry', 2)
  const region = safeHeader(request, 'cf-region', 100)
  const regionCode = safeHeader(request, 'cf-region-code', 12)
  const city = safeHeader(request, 'cf-ipcity', 100)
  const timezone = safeHeader(request, 'cf-timezone', 80)
  const location = {
    ...(country ? { country } : {}),
    ...(region ? { region } : {}),
    ...(regionCode ? { regionCode } : {}),
    ...(city ? { city } : {}),
    ...(timezone ? { timezone } : {}),
  }
  return Object.keys(location).length > 0 ? location : undefined
}

function browserFromUserAgent(userAgent: string | undefined): ChatDiagnosticsMetadata['browser'] {
  if (!userAgent) return undefined

  const browser = [
    ['Edge', /(?:Edg|Edge)\/([\d.]+)/i],
    ['Opera', /(?:OPR|Opera)\/([\d.]+)/i],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/i],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/i],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/i],
    ['Safari', /Version\/([\d.]+).*Safari/i],
  ] as const
  const browserMatch = browser.map(([name, expression]) => ({ name, version: userAgent.match(expression)?.[1] })).find(({ version }) => version)
  const operatingSystem = /(?:iPhone|iPad|iPod).*OS ([\d_]+)/i.test(userAgent)
    ? 'iOS'
    : /Android(?:[ /-]([\d.]+))?/i.test(userAgent)
      ? 'Android'
      : /Windows NT ([\d.]+)/i.test(userAgent)
        ? 'Windows'
        : /Mac OS X ([\d_]+)/i.test(userAgent)
          ? 'macOS'
          : /CrOS/i.test(userAgent)
            ? 'ChromeOS'
            : /Linux/i.test(userAgent)
              ? 'Linux'
              : undefined
  const device = /iPad|Tablet/i.test(userAgent)
    ? 'tablet'
    : /Mobile|iPhone|iPod|Android/i.test(userAgent)
      ? 'mobile'
      : 'desktop'

  return {
    ...(browserMatch ? { name: browserMatch.name, ...(browserMatch.version ? { version: browserMatch.version } : {}) } : {}),
    ...(operatingSystem ? { operatingSystem } : {}),
    device,
  }
}

function referrerPath(request: Request): string | undefined {
  const referrer = request.headers.get('referer')
  if (!referrer) return undefined
  try {
    return redactDiagnosticsText(new URL(referrer).pathname).slice(0, 300) || '/'
  } catch {
    return undefined
  }
}

export function chatRequestMetadataFromRequest(
  request: Request,
  options: { cloudflareOriginVerifySecret?: string },
): ChatDiagnosticsMetadata | undefined {
  const hasTrustedOrigin = hasTrustedCloudflareOrigin(request, options.cloudflareOriginVerifySecret)
  const ipHeader = hasTrustedOrigin ? request.headers.get('cf-connecting-ip')?.trim() : undefined
  const ipAddress = ipHeader && isValidIpAddress(ipHeader) ? ipHeader : undefined
  const location = ipAddress ? locationFromRequest(request) : undefined
  const browser = browserFromUserAgent(safeHeader(request, 'user-agent', 512, false))
  const language = safeHeader(request, 'accept-language', 120)
  const pagePath = referrerPath(request)
  const metadata: ChatDiagnosticsMetadata = {
    ...(ipAddress ? { ipAddress } : {}),
    ...(location ? { location } : {}),
    ...(browser ? { browser } : {}),
    ...(language ? { language } : {}),
    ...(pagePath ? { pagePath } : {}),
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined
}
