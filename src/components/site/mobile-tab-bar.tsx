import { Menu } from '@base-ui/react/menu'
import { Link, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  Ellipsis,
  FolderOpen,
  House,
  LayoutGrid,
  MessageSquare,
  Pencil,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { AboutSiteDialog } from '@/components/site/shell/about-site-dialog'

/**
 * The mobile navigation bar, pinned to the bottom of every page below Tailwind's
 * `sm`. Four tabs carry the primary destinations and a More menu holds the rest,
 * so no page is reachable only by scrolling a menu.
 *
 * It replaces the old header `MENU` button and its vaul bottom sheet: the sheet
 * covered the content it was navigating to, and the header had no room for both
 * the button and the About-this-site control. The bar is `position: fixed` and
 * the shell reserves `--os-tab-bar-reserve` for it (see `styles/shell.css` and
 * the `< 40rem` block in `styles/responsive.css`), so content never scrolls under
 * it in either mobile scroll model.
 *
 * Desktop is untouched: the header dropdowns and the left shortcut dock remain
 * the desktop navigation, and this element is `display: none` above `sm`.
 *
 * Layout, active/hover/focus states and the `display` gate live in CSS rather
 * than Tailwind because unlayered rules beat Tailwind's `utilities` layer, which
 * is what lets one rule win over the responsive utilities on the header.
 */

/** The four primary tabs, in bar order. Ordering is the product contract. */
const mobileTabBarItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/services', label: 'Services', icon: LayoutGrid },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
]

/** Everything the four tabs do not cover, in menu order. */
const mobileMoreItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/about', label: 'About', icon: User },
  { href: '/blog', label: 'Blog', icon: Pencil },
  { href: '/changelog', label: 'Changelog', icon: RefreshCw },
  { href: '/contact', label: 'Contact', icon: AtSign },
]

/**
 * Descriptions reused verbatim from `headerMenus` in `shell.tsx`, so a More entry
 * and its desktop dropdown counterpart read identically.
 */
const moreDescriptions: Record<string, string> = {
  '/about': 'Background, values & current focus',
  '/blog': 'Notes, ideas & build logs',
  '/changelog': 'Release notes & system updates',
  '/contact': 'Send a direct message',
}

// Copied verbatim from `shell.tsx`: both modules need it, and three lines do not
// justify a shared module.
function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileTabBar() {
  const location = useLocation()
  const [aboutOpen, setAboutOpen] = useState(false)
  const moreActive = mobileMoreItems.some((item) => isCurrent(location.pathname, item.href))

  return (
    <>
      <nav className="os-mobile-tab-bar" aria-label="Primary">
        {mobileTabBarItems.map((item) => {
          const active = isCurrent(location.pathname, item.href)
          const ItemIcon = item.icon
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={cn('os-mobile-tab', active && 'is-active')}
              key={item.href}
              to={item.href}
            >
              <span className="os-mobile-tab-art" aria-hidden="true">
                <ItemIcon className="size-5 shrink-0" strokeWidth={2.5} />
              </span>
              <span className="os-mobile-tab-label">{item.label}</span>
            </Link>
          )
        })}
        <Menu.Root>
          <Menu.Trigger aria-label="More" className="os-mobile-tab" data-active={moreActive || undefined}>
            <span className="os-mobile-tab-art" aria-hidden="true">
              <Ellipsis className="size-5 shrink-0" strokeWidth={2.5} />
            </span>
            <span className="os-mobile-tab-label">More</span>
          </Menu.Trigger>
          <Menu.Portal>
            {/* `side="top"` is load-bearing: the bar is at the bottom, so the
                default `bottom` would place the popup off-screen. */}
            <Menu.Positioner align="center" className="os-mobile-more-positioner" side="top" sideOffset={10}>
              <Menu.Popup className="system-menu-popover">
                {mobileMoreItems.map((entry) => {
                  const active = isCurrent(location.pathname, entry.href)
                  const EntryIcon = entry.icon
                  return (
                    <Menu.Item
                      aria-current={active ? 'page' : undefined}
                      className="system-menu-link"
                      key={entry.href}
                      render={<Link to={entry.href} />}
                    >
                      <span className="menu-entry-glyph" aria-hidden="true">
                        <EntryIcon className="size-4 shrink-0" strokeWidth={2.5} />
                      </span>
                      <span className="menu-entry-copy">
                        <span className="menu-entry-title">{entry.label}</span>
                        <span className="menu-entry-description">{moreDescriptions[entry.href]}</span>
                      </span>
                      {active ? <span className="menu-entry-current">OPEN</span> : null}
                    </Menu.Item>
                  )
                })}
                <Menu.Item className="system-menu-link" label="About this site" onClick={() => setAboutOpen(true)}>
                  <span className="menu-entry-glyph" aria-hidden="true">
                    <Sparkles className="size-4 shrink-0" strokeWidth={2.5} />
                  </span>
                  <span className="menu-entry-copy">
                    <span className="menu-entry-title">About this site</span>
                    <span className="menu-entry-description">Stack, licence & services</span>
                  </span>
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </nav>
      <AboutSiteDialog onOpenChange={setAboutOpen} open={aboutOpen} />
    </>
  )
}
