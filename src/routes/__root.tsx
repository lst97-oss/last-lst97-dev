import { withPayloadRoot } from '@payloadcms/tanstack-start/client'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { NoJavaScriptNotice } from '@/components/site/no-javascript-notice'
import { NotFoundPage } from '@/components/site/not-found-page'
import noJavaScriptCss from '@/styles/no-javascript-notice.css?url'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { createSiteStructuredData, SITE_NAME, SITE_TAGLINE } from '../lib/seo/site-seo'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
    // Site-wide structured data. Child routes own title/description and merge
    // in, so only the graph is declared here. The first entry is the boot
    // script, not structured data: two boot signals ride on one class each.
    // `js-enabled` hides the no-JavaScript blocker. `js-hydrated` is the CSS
    // gate the site layout waits on (see `components/site/boot-gate.tsx`); the
    // effect there adds it as hydration commits, and the inline timer below
    // adds it unconditionally after 8s so a stalled or failed load still
    // reveals the page rather than leaving the skeleton up forever. It lives in
    // the document, not a component, precisely because it has to survive the
    // failure it covers.
    scripts: [
      {
        children:
          "document.documentElement.classList.add('js-enabled');setTimeout(function(){document.documentElement.classList.add('js-hydrated')},8000)",
      },
      { type: 'application/ld+json', children: JSON.stringify(createSiteStructuredData()).replace(/</g, '\\u003c') },
    ],
    links: [
      // The full icon set lives in /favicon. Browsers pick the best match, and
      // `data:,` is deliberately not used — an empty href suppresses the icon.
      { rel: 'icon', href: '/favicon/favicon.ico', sizes: '32x32 48x48' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon/favicon.svg' },
      { rel: 'icon', type: 'image/png', href: '/favicon/favicon-96x96.png', sizes: '96x96' },
      { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png', sizes: '180x180' },
      { rel: 'manifest', href: '/favicon/site.webmanifest' },
      { rel: 'alternate', type: 'text/plain', href: '/llms.txt', title: 'llms.txt' },
      { rel: 'author', href: '/humans.txt' },
      { rel: 'security.txt', href: '/.well-known/security.txt' },
      { rel: 'stylesheet', href: noJavaScriptCss },
    ],
  }),
  // `withPayloadRoot` hands the `<html>` element to Payload's own shell on
  // `/admin` routes, which is the only place `data-theme`/`lang`/`dir` get set
  // from server-computed layout data. A hand-rolled shell here left ~60
  // `[dir]`/`[data-theme]`-scoped admin rules permanently unmatchable.
  shellComponent: withPayloadRoot(RootDocument),
  notFoundComponent: () => <NotFoundPage />,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <NoJavaScriptNotice />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
