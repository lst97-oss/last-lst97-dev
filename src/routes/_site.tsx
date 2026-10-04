import { createFileRoute, Outlet } from '@tanstack/react-router'

import { BootGate } from '@/components/site/boot-gate'
import { NotFoundPage } from '@/components/site/not-found-page'
import { DesktopShell } from '@/components/site/shell'
import { SiteHealthProvider } from '@/components/site/site-health-provider'
import { Toaster } from '@/components/ui/sonner'
import { getMelbourneTemperatureServerFn } from '@/server/melbourne-temperature/server-functions'
import siteCss from '@/styles.css?url'

export const Route = createFileRoute('/_site')({
  component: SiteLayout,
  // The header chrome is shared by every page, so the temperature is resolved
  // once here rather than per route. It is cached in memory for an hour
  // server-side, so only the first request per hour per instance pays for it.
  loader: async () => ({ temperature: await getMelbourneTemperatureServerFn() }),
  // The site stylesheet link above only reaches the document when this
  // layout's match is inside the asset lane. A child route's `notFound()`
  // used to walk past `_site` to the root boundary, and the router truncates
  // the lane at the not-found match (`_getAssetMatches`, `projectLane`), so
  // the sheet was never linked and `.os-site` rendered unstyled with a global
  // page scrollbar. Owning the boundary here keeps the sheet in the lane.
  // It cannot shadow Payload: `/_payload` is a sibling of `/_site`, and the
  // admin routes declare their own `AdminNotFound` boundary.
  notFoundComponent: () => <NotFoundPage />,
  head: () => ({
    links: [{ rel: 'stylesheet', href: siteCss }],
  }),
})

function SiteLayout() {
  const { temperature } = Route.useLoaderData()

  return (
    <SiteHealthProvider>
      <BootGate>
        <DesktopShell temperature={temperature}>
          <Outlet />
        </DesktopShell>
      </BootGate>
      {/* Toast host, mounted once for every public route — `/_payload/admin`
          is a sibling of `/_site` and brings Payload's own Toaster, so the two
          never double up.

          It sits OUTSIDE `BootGate` deliberately: the gate's content wrapper is
          `display: none` until `html.js-hydrated`, so a toast raised during
          hydration would be mounted but invisible. Sonner positions its list
          `fixed`, so nothing in the shell tree is needed for that to work —
          and it must never be moved inside a window frame, whose
          `overflow: hidden` viewport scrolls its content. */}
      <Toaster />
    </SiteHealthProvider>
  )
}
