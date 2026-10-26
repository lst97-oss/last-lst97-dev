// Must match the '/api/site/health' routeRules entry in vite.config.ts: the
// runtime rule overwrites this header in production (OG precedent), so the
// two literals are intentionally duplicated, not shared.
const HEALTH_CACHE_CONTROL = 'public, max-age=0, s-maxage=300'

export function createSiteHealthGetHandler() {
  return function GET() {
    return Response.json({ status: 'ok' }, { headers: { 'cache-control': HEALTH_CACHE_CONTROL } })
  }
}
