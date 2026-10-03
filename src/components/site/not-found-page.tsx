import { Link, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'

import { Eyebrow, PageStack, pixelButtonVariants, Tag } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { DesktopShell } from '@/components/site/shell'
import { SiteHealthProvider } from '@/components/site/site-health-provider'
import { WindowFrame } from '@/components/site/window-frame'

const NOT_FOUND_WINDOW_ID = '404.exe'

/**
 * Global not-found surface.
 *
 * Registered at both `__root.tsx` (`notFoundComponent`) and `src/router.tsx`
 * (`defaultNotFoundComponent`), so it must render the desktop chrome itself:
 * the header/sidebar live in `_site.tsx`, which is a *child* of the root route
 * and therefore is not in the tree when a match fails to resolve. The
 * composition below mirrors `_site.tsx:16-22` exactly.
 *
 * `notFoundComponent` has no `head` hook, so this page inherits the root
 * document title. That is a known limitation of the boundary, not an oversight.
 */
export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <SiteHealthProvider>
      <DesktopShell>
        <PageStack>
          <WindowFrame
            title={NOT_FOUND_WINDOW_ID}
            icon="⚠"
            className="not-found-window"
            closeHref="/"
            windowId={NOT_FOUND_WINDOW_ID}
            // Every other non-home window scrolls through the themed
            // ScrollArea. A long requested path would otherwise grow this
            // frame, and below 650px the shell clamp is only re-applied for
            // `window-frame--scroll`, so the overflow would leak onto <body>.
            scrollable
          >
            <Eyebrow>
              <PixelIcon glyph="⚠" /> ERROR / 404
            </Eyebrow>
            <h1>
              404<span>.exe not found.</span>
            </h1>
            <p className="lead-copy mt-4">This path does not exist on the system.</p>
            <p className="not-found-path mt-4">
              <Tag>REQUESTED: {pathname}</Tag>
            </p>
            <div className="not-found-actions mt-7 flex flex-wrap gap-2.5">
              <Link className={cn(pixelButtonVariants())} to="/">
                <PixelIcon glyph="◆" /> RETURN TO DESKTOP
              </Link>
              <Link className={cn(pixelButtonVariants())} to="/projects">
                <PixelIcon glyph="▤" /> BROWSE PROJECTS
              </Link>
            </div>
          </WindowFrame>
        </PageStack>
      </DesktopShell>
    </SiteHealthProvider>
  )
}
