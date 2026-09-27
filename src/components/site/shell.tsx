import { Menu } from '@base-ui/react/menu'
import { Link, useLocation } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { type ReactNode, useEffect, useState } from 'react'

import { updateOpenHeaderMenu } from '../../lib/header-menu-state'
import { formatMelbourneDate, formatMelbourneShortDate } from '../../lib/melbourne-date'
import { osStore } from '../../lib/os-store'
import { siteHealthLabel } from '../../lib/site-health'
import { PixelBattleBackground } from './battle/pixel-battle-background'
import { MobileNavDrawer } from './mobile-nav-drawer'
import { PixelIcon } from './pixel-icon'
import { useSiteHealthStatus } from './site-health-provider'

const shortcuts = [
  { href: '/about', label: 'About', glyph: '☺' },
  { href: '/blog', label: 'Blog', glyph: '✎' },
  { href: '/projects', label: 'Projects', glyph: '▤' },
  { href: '/changelog', label: 'Changelog', glyph: '↻' },
  { href: '/chat', label: 'Chat', glyph: '>' },
  { href: '/contact', label: 'Contact', glyph: '@' },
]

const headerMenus = [
  {
    label: 'Explore',
    entries: [
      { href: '/blog', label: 'Blog', description: 'Notes, ideas & build logs', glyph: '✎' },
      { href: '/projects', label: 'Projects', description: 'Selected work & experiments', glyph: '▤' },
      { href: '/changelog', label: 'Changelog', description: 'Release notes & system updates', glyph: '↻' },
    ],
  },
  {
    label: 'Operator',
    entries: [
      { href: '/about', label: 'About me', description: 'Background, values & current focus', glyph: '☺' },
    ],
  },
  {
    label: 'Connect',
    entries: [
      { href: '/chat', label: 'Start a chat', description: 'Ask about the work and ideas', glyph: '>' },
      { href: '/contact', label: 'Contact', description: 'Send a direct message', glyph: '@' },
    ],
  },
] as const

function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function MelbourneClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <time className="system-clock" dateTime={now?.toISOString()} aria-label="Current Melbourne time and date">
      {now ? (
        <>
          <span className="system-clock-full">{`MEL · ${formatMelbourneDate(now)}`}</span>
          <span className="system-clock-short">{`MEL · ${formatMelbourneShortDate(now)}`}</span>
        </>
      ) : (
        'MEL · SYNCING'
      )}
    </time>
  )
}

export function DesktopShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const activeWindowId = useStore(osStore, (state) => state.activeWindowId)
  const healthStatus = useSiteHealthStatus()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="os-site">
      <PixelBattleBackground />
      <header className="system-bar">
        <div className="system-menu-left">
          <Link className="system-brand" to="/" aria-label="Open home desktop">
            <PixelIcon glyph="◆" /> LAST//OS
          </Link>
          <button
            className="system-menu-button"
            type="button"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            ☰ MENU
          </button>
          <nav className="system-menu" aria-label="Site shortcuts">
            {headerMenus.map((menu) => (
              <Menu.Root
                key={menu.label}
                onOpenChange={(isOpen) => {
                  setOpenMenu((activeMenu) => updateOpenHeaderMenu(activeMenu, menu.label, isOpen))
                }}
                open={openMenu === menu.label}
              >
                <Menu.Trigger className="system-menu-item">
                  {menu.label}<span className="menu-caret" aria-hidden="true">⌄</span>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner align="start" className="system-menu-positioner" sideOffset={10}>
                    <Menu.Popup className="system-menu-popover">
                      {menu.entries.map((entry) => (
                        <Menu.Item
                          aria-current={isCurrent(location.pathname, entry.href) ? 'page' : undefined}
                          className="system-menu-link"
                          key={entry.href}
                          render={<Link to={entry.href} />}
                        >
                          <span className="menu-entry-glyph" aria-hidden="true">{entry.glyph}</span>
                          <span className="menu-entry-copy">
                            <span className="menu-entry-title">{entry.label}</span>
                            <span className="menu-entry-description">{entry.description}</span>
                          </span>
                          {isCurrent(location.pathname, entry.href) ? <span className="menu-entry-current">OPEN</span> : null}
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            ))}
          </nav>
        </div>
        <div className="system-menu-right" aria-label="System status">
          <span className="system-status" data-health={healthStatus} role="status" aria-live="polite">
            ● {siteHealthLabel(healthStatus)}
          </span>
          {activeWindowId ? <span className="system-active-window">▣ {activeWindowId}</span> : null}
          <span aria-hidden="true">⌁ Wi-Fi</span>
          <span aria-hidden="true">▣ 100%</span>
          <MelbourneClock />
        </div>
      </header>

      <div className="desktop-workspace">
        <aside className="desktop-shortcuts" aria-label="Desktop sidebar">
          {shortcuts.map((shortcut) => (
            <Link
              className={`desktop-shortcut ${isCurrent(location.pathname, shortcut.href) ? 'is-active' : ''}`}
              key={shortcut.href}
              to={shortcut.href}
            >
              <span className="shortcut-art">
                <PixelIcon glyph={shortcut.glyph} />
              </span>
              <span>{shortcut.label}</span>
            </Link>
          ))}
        </aside>
        <main className="desktop-main">{children}</main>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </div>
  )
}
