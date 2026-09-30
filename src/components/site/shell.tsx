import { Menu } from '@base-ui/react/menu'
import { Link, useLocation } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { type ReactNode, useEffect, useState } from 'react'
import { PixelBattleBackground } from '@/components/site/battle/pixel-battle-background'
import { MobileNavDrawer } from '@/components/site/mobile-nav-drawer'
import { PixelIcon } from '@/components/site/pixel-icon'
import { AboutSiteDialog } from '@/components/site/shell/about-site-dialog'
import { useSiteHealthStatus } from '@/components/site/site-health-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { updateOpenHeaderMenu } from '@/lib/header-menu-state'
import { formatMelbourneDate, formatMelbourneShortDate } from '@/lib/melbourne-date'
import { osStore } from '@/lib/os-store'
import { siteHealthLabel } from '@/lib/site-health'

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
    <time className="system-clock text-muted" dateTime={now?.toISOString()} aria-label="Current Melbourne time and date">
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

const melbourneBomUrl = new URL('https://api.open-meteo.com/v1/bom')
melbourneBomUrl.search = new URLSearchParams({
  latitude: '-37.8136',
  longitude: '144.9631',
  hourly: 'temperature_2m',
  temperature_unit: 'celsius',
  timezone: 'Australia/Melbourne',
  forecast_days: '1',
}).toString()

const melbourneForecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
melbourneForecastUrl.search = new URLSearchParams({
  latitude: '-37.8136',
  longitude: '144.9631',
  current: 'temperature_2m',
  temperature_unit: 'celsius',
  timezone: 'Australia/Melbourne',
}).toString()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const MELBOURNE_BOM_PARTS = new Intl.DateTimeFormat('en', {
  timeZone: 'Australia/Melbourne',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

function getMelbourneBomTemperature(payload: unknown, now: Date): number | null {
  if (!isRecord(payload) || !isRecord(payload.hourly)) return null

  const hourly = payload.hourly
  if (!Array.isArray(hourly.time) || !Array.isArray(hourly.temperature_2m)) return null

  const parts = MELBOURNE_BOM_PARTS.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')
  const hour = part('hour')
  if (!year || !month || !day || !hour) return null

  const currentHour = `${year}-${month}-${day}T${hour}:`
  const index = hourly.time.findIndex((time) => typeof time === 'string' && time.startsWith(currentHour))
  const temperature = hourly.temperature_2m[index]

  return typeof temperature === 'number' && Number.isFinite(temperature) ? temperature : null
}

function getMelbourneForecastTemperature(payload: unknown): number | null {
  if (!isRecord(payload) || !isRecord(payload.current)) return null

  const temperature = payload.current.temperature_2m
  return typeof temperature === 'number' && Number.isFinite(temperature) ? temperature : null
}

async function requestMelbourneTemperature(
  url: URL,
  signal: AbortSignal,
  parseTemperature: (payload: unknown) => number | null,
): Promise<number | null> {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null

    return parseTemperature(await response.json())
  } catch (error) {
    if (signal.aborted) throw error
    return null
  }
}

function MelbourneTemperature() {
  const [temperature, setTemperature] = useState<number | null>(null)

  useEffect(() => {
    let disposed = false
    let activeRequest: AbortController | null = null

    const updateTemperature = async () => {
      activeRequest?.abort()
      const controller = new AbortController()
      activeRequest = controller
      const timeout = window.setTimeout(() => controller.abort(), 8_000)

      try {
        let nextTemperature = await requestMelbourneTemperature(
          melbourneBomUrl,
          controller.signal,
          (payload) => getMelbourneBomTemperature(payload, new Date()),
        )

        if (nextTemperature === null) {
          nextTemperature = await requestMelbourneTemperature(
            melbourneForecastUrl,
            controller.signal,
            getMelbourneForecastTemperature,
          )
        }

        if (!disposed && activeRequest === controller) setTemperature(nextTemperature)
      } catch {
        if (!disposed && activeRequest === controller) setTemperature(null)
      } finally {
        window.clearTimeout(timeout)
        if (activeRequest === controller) activeRequest = null
      }
    }

    void updateTemperature()
    const interval = window.setInterval(() => void updateTemperature(), 30 * 60 * 1_000)

    return () => {
      disposed = true
      activeRequest?.abort()
      window.clearInterval(interval)
    }
  }, [])

  const temperatureLabel = temperature === null ? '—' : `${Math.round(temperature)}°C`

  return (
    <span
      aria-label={temperature === null ? 'Melbourne temperature unavailable' : `Melbourne forecast: ${Math.round(temperature)} degrees Celsius`}
      className="system-temperature max-sm:hidden"
      title="Melbourne temperature from Open-Meteo, using the Bureau of Meteorology when available"
    >
      MEL · {temperatureLabel}
    </span>
  )
}

export function DesktopShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const activeWindowId = useStore(osStore, (state) => state.activeWindowId)
  const healthStatus = useSiteHealthStatus()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="os-site flex h-dvh flex-col overflow-hidden bg-background">
      <PixelBattleBackground />
      <header className="system-bar sticky top-0 z-20 flex min-h-12 items-center justify-between gap-2 border-b-3 border-border bg-foreground px-3 py-2 text-xs font-black tracking-widest text-background uppercase sm:gap-5 sm:px-5">
        <div className="system-menu-left flex min-w-0 items-center gap-2 sm:gap-4">
          <Link className="system-brand inline-flex items-center gap-2 font-black text-primary" to="/" aria-label="Open home desktop">
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
                  {menu.label}<span className="menu-caret text-xs leading-none" aria-hidden="true">⌄</span>
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
        <div className="system-menu-right ml-auto flex min-w-0 items-center gap-2 text-xs whitespace-nowrap text-muted sm:gap-4" aria-label="System status">
          <span className="system-status text-secondary data-[health=checking]:text-primary data-[health=offline]:text-accent max-sm:hidden" data-health={healthStatus} role="status" aria-live="polite">
            ● {siteHealthLabel(healthStatus)}
          </span>
          {activeWindowId ? <span className="system-active-window max-w-44 overflow-hidden text-ellipsis whitespace-nowrap text-muted max-sm:hidden">▣ {activeWindowId}</span> : null}
          <MelbourneTemperature />
          <MelbourneClock />
          <AboutSiteDialog />
        </div>
      </header>

      <div className="desktop-workspace relative z-10 grid flex-1">
        <aside className="desktop-shortcuts" aria-label="Desktop sidebar">
          {shortcuts.map((shortcut) => (
            <Link
              className={`desktop-shortcut flex w-22 flex-col items-center gap-1.5 p-1 text-center text-xs font-black tracking-wide text-foreground uppercase hover:bg-primary ${isCurrent(location.pathname, shortcut.href) ? 'is-active' : ''}`}
              key={shortcut.href}
              to={shortcut.href}
            >
              <span className="shortcut-art grid size-11 place-items-center border-3 border-border bg-card text-2xl shadow-os-sm">
                <PixelIcon glyph={shortcut.glyph} />
              </span>
              <span>{shortcut.label}</span>
            </Link>
          ))}
        </aside>
        <ScrollArea className="desktop-main min-w-0" viewportProps={{ className: 'px-5 py-8 sm:px-8 lg:px-16' }}>
          {children}
        </ScrollArea>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </div>
  )
}
