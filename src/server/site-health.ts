export function createSiteHealthGetHandler() {
  return function GET() {
    return Response.json(
      { status: 'ok' },
      { headers: { 'cache-control': 'no-store' } },
    )
  }
}
