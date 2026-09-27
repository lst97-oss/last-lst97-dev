export type SiteHealthStatus = 'checking' | 'online' | 'offline'
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function siteHealthLabel(status: SiteHealthStatus): string {
  return status.toUpperCase()
}

export async function fetchSiteHealthStatus(fetcher: FetchLike = fetch, signal?: AbortSignal): Promise<Exclude<SiteHealthStatus, 'checking'>> {
  try {
    const response = await fetcher('/api/site/health', {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      ...(signal ? { signal } : {}),
    })
    if (!response.ok) return 'offline'

    const payload: unknown = await response.json()
    if (typeof payload !== 'object' || payload === null || !('status' in payload) || payload.status !== 'ok') {
      return 'offline'
    }

    return 'online'
  } catch {
    return 'offline'
  }
}
