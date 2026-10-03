import { Menu } from '@base-ui/react/menu'
import { Link, useLocation } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import type { LucideIcon } from 'lucide-react'
import { AtSign, FolderOpen, LayoutGrid, MessageSquare, Pencil, RefreshCw, User } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { PixelBattleBackground } from '@/components/site/battle/pixel-battle-background'
import { MobileNavDrawer } from '@/components/site/mobile-nav-drawer'
import { PixelIcon } from '@/components/site/pixel-icon'
import { GlobalRouteProgress } from '@/components/site/route-progress-bar'
import { AboutSiteDialog } from '@/components/site/shell/about-site-dialog'
import { useSiteHealthStatus } from '@/components/site/site-health-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { updateOpenHeaderMenu } from '@/lib/header-menu-state'
import { formatMelbourneDate, formatMelbourneShortDate } from '@/lib/melbourne-date'
import { osStore } from '@/lib/os-store'
import { siteHealthLabel } from '@/lib/site-health'

const shortcuts: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/about', label: 'About', icon: User },
  { href: '/services', label: 'Services', icon: LayoutGrid },
  { href: '/blog', label: 'Blog', icon: Pencil },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/changelog', label: 'Changelog', icon: RefreshCw },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/contact', label: 'Contact', icon: AtSign },
]

const headerMenus = [
  {
    label: 'Explore',
    entries: [
      { href: '/blog', label: 'Blog', description: 'Notes, ideas & build logs', icon: Pencil },
      { href: '/projects', label: 'Projects', description: 'Selected work & experiments', icon: FolderOpen },
      { href: '/changelog', label: 'Changelog', description: 'Release notes & system updates', icon: RefreshCw },
    ],
  },
  {
    label: 'Services',
    entries: [
      { href: '/services', label: 'Website packages', description: 'Pricing, inclusions & process', icon: LayoutGrid },
      { href: '/contact', label: 'Request a quote', description: 'Send requirements for a fixed price', icon: AtSign },
    ],
  },
  {
    label: 'Operator',
    entries: [{ href: '/about', label: 'About me', description: 'Background, values & current focus', icon: User }],
  },
  {
    label: 'Connect',
    entries: [
      { href: '/chat', label: 'Start a chat', description: 'Ask about the work and ideas', icon: MessageSquare },
      { href: '/contact', label: 'Contact', description: 'Send a direct message', icon: AtSign },
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
    <time
      className="system-clock text-muted"
      dateTime={now?.toISOString()}
      aria-label="Current Melbourne time and date"
    >
      {now ? (
        <>
          <span className="system-clock-full max-sm:hidden">{`MEL · ${formatMelbourneDate(now)}`}</span>
          <span className="system-clock-short hidden max-sm:inline">{`MEL · ${formatMelbourneShortDate(now)}`}</span>
        </>
      ) : (
        'MEL · SYNCING'
      )}
    </time>
  )
}

// The reading arrives from the `_site` loader via `src/server/melbourne-temperature`,
// where it is cached for an hour and shared by every visitor. It used to be
// fetched here in an effect on every mount and every 30 minutes, and the
// initial `—` was one of the header swaps `BootGate` exists to hide.
function MelbourneTemperature({ temperature }: { temperature: number | null }) {
  return (
    <span
      aria-label={
        temperature === null
          ? 'Melbourne temperature unavailable'
          : `Melbourne forecast: ${Math.round(temperature)} degrees Celsius`
      }
      className="system-temperature max-sm:hidden"
      title="Melbourne temperature from Open-Meteo, using the Bureau of Meteorology when available"
    >
      MEL · {temperature === null ? '—' : `${Math.round(temperature)}°C`}
    </span>
  )
}

// `temperature` is optional because `NotFoundPage` renders this shell from the
// ROOT not-found boundary, where the `_site` loader that resolves it never runs.
// That surface renders `—` rather than blocking the 404 on a weather request.
export function DesktopShell({ children, temperature = null }: { children: ReactNode; temperature?: number | null }) {
  const location = useLocation()
  const activeWindowId = useStore(osStore, (state) => state.activeWindowId)
  const healthStatus = useSiteHealthStatus()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="os-site flex h-dvh flex-col overflow-hidden bg-background">
      <PixelBattleBackground />
      <GlobalRouteProgress />
      <header className="system-bar sticky top-0 z-20 flex min-h-12 items-center justify-between gap-2 border-b-3 border-border bg-foreground px-3 py-2 text-xs font-black tracking-widest text-background uppercase sm:gap-5 sm:px-5">
        <div className="system-menu-left flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            className="system-brand inline-flex items-center gap-2 font-black text-primary"
            to="/"
            aria-label="Open home desktop"
          >
            <PixelIcon glyph="◆" /> LAST//OS
          </Link>
          <button
            className="system-menu-button hidden min-h-11 items-center gap-1.5 border-2 border-primary px-3 py-2 text-xs font-black tracking-widest text-primary uppercase hover:border-accent hover:bg-accent hover:text-foreground max-sm:inline-flex"
            type="button"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            ☰ MENU
          </button>
          <nav className="system-menu flex items-center gap-1 max-sm:hidden" aria-label="Site shortcuts">
            {headerMenus.map((menu) => (
              <Menu.Root
                key={menu.label}
                onOpenChange={(isOpen) => {
                  setOpenMenu((activeMenu) => updateOpenHeaderMenu(activeMenu, menu.label, isOpen))
                }}
                open={openMenu === menu.label}
              >
                <Menu.Trigger className="system-menu-item inline-flex items-center gap-1 px-1.5 py-1 text-xs font-black tracking-widest text-muted uppercase hover:bg-accent hover:text-foreground">
                  {menu.label}
                  <span className="menu-caret text-xs leading-none" aria-hidden="true">
                    ⌄
                  </span>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner align="start" className="system-menu-positioner" sideOffset={10}>
                    <Menu.Popup className="system-menu-popover">
                      {menu.entries.map((entry) => {
                        const EntryIcon = entry.icon
                        return (
                          <Menu.Item
                            aria-current={isCurrent(location.pathname, entry.href) ? 'page' : undefined}
                            className="system-menu-link"
                            key={entry.href}
                            render={<Link to={entry.href} />}
                          >
                            <span className="menu-entry-glyph" aria-hidden="true">
                              <EntryIcon className="size-4 shrink-0" strokeWidth={2.5} />
                            </span>
                            <span className="menu-entry-copy">
                              <span className="menu-entry-title">{entry.label}</span>
                              <span className="menu-entry-description">{entry.description}</span>
                            </span>
                            {isCurrent(location.pathname, entry.href) ? (
                              <span className="menu-entry-current">OPEN</span>
                            ) : null}
                          </Menu.Item>
                        )
                      })}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            ))}
          </nav>
        </div>
        <div
          className="system-menu-right ml-auto flex min-w-0 items-center gap-2 text-xs whitespace-nowrap text-muted sm:gap-4"
          aria-label="System status"
        >
          <span
            className="system-status text-secondary data-[health=checking]:text-primary data-[health=offline]:text-accent max-sm:hidden"
            data-health={healthStatus}
            role="status"
            aria-live="polite"
          >
            ● {siteHealthLabel(healthStatus)}
          </span>
          {activeWindowId ? (
            <span className="system-active-window max-w-44 overflow-hidden text-ellipsis whitespace-nowrap text-muted max-sm:hidden">
              ▣ {activeWindowId}
            </span>
          ) : null}
          <MelbourneTemperature temperature={temperature} />
          <MelbourneClock />
          <AboutSiteDialog />
        </div>
      </header>

      <div className="desktop-workspace relative z-10 grid flex-1">
        <ScrollArea className="desktop-shortcuts" viewportProps={{ className: 'desktop-shortcuts-viewport' }}>
          {shortcuts.map((shortcut) => {
            const ShortcutIcon = shortcut.icon
            return (
              <Link
                className={`desktop-shortcut flex w-22 flex-col items-center gap-1.5 border-3 border-transparent p-1 text-center text-xs font-black tracking-wide text-foreground uppercase hover:border-border hover:bg-primary ${isCurrent(location.pathname, shortcut.href) ? 'is-active' : ''}`}
                key={shortcut.href}
                to={shortcut.href}
              >
                <span className="shortcut-art grid size-11 place-items-center border-3 border-border bg-card shadow-os-sm">
                  <ShortcutIcon aria-hidden="true" className="size-6 shrink-0 text-accent" strokeWidth={2.5} />
                </span>
                <span>{shortcut.label}</span>
              </Link>
            )
          })}
        </ScrollArea>
        <ScrollArea className="desktop-main min-w-0" viewportProps={{ className: 'px-5 py-8 sm:px-8 lg:px-16' }}>
          {children}
        </ScrollArea>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </div>
  )
}
