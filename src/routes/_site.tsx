import { createFileRoute, Outlet } from '@tanstack/react-router'

import { DesktopShell } from '@/components/site/shell'
import { SiteHealthProvider } from '@/components/site/site-health-provider'
import siteCss from '@/styles.css?url'

export const Route = createFileRoute('/_site')({
  component: SiteLayout,
  head: () => ({
    links: [{ rel: 'stylesheet', href: siteCss }],
  }),
})

function SiteLayout() {
  return (
    <SiteHealthProvider>
      <DesktopShell>
        <Outlet />
      </DesktopShell>
    </SiteHealthProvider>
  )
}
