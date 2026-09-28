import { Link, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'
import { useEffect } from 'react'
import { PixelIcon } from '@/components/site/pixel-icon'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'

export const mobileNavShortcuts = [
  { href: '/', label: 'Home', glyph: '⌂' },
  { href: '/about', label: 'About', glyph: '☺' },
  { href: '/blog', label: 'Blog', glyph: '✎' },
  { href: '/projects', label: 'Projects', glyph: '▤' },
  { href: '/changelog', label: 'Changes', glyph: '↻' },
  { href: '/chat', label: 'Chat', glyph: '>' },
  { href: '/contact', label: 'Contact', glyph: '@' },
]

function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

interface MobileNavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const location = useLocation()
  const close = () => onOpenChange(false)

  useEffect(() => {
    onOpenChange(false)
    // Close the sheet on route change. Intentionally watching pathname only.
  }, [location.pathname, onOpenChange])

  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange}>
      <DrawerContent id="mobile-nav-drawer" className="os-mobile-nav-content border-t-3 border-border bg-card text-foreground" aria-label="Site navigation">
        <DrawerTitle className="os-mobile-nav-title m-0 flex items-center justify-center gap-2 px-4 pt-3 text-xs font-black tracking-widest uppercase">
          <PixelIcon glyph="◆" className="text-foreground" /> NAVIGATE
        </DrawerTitle>
        <nav className="os-mobile-dock-grid grid grid-cols-3 gap-2.5 p-3.5 pb-5" aria-label="Site shortcuts">
          {mobileNavShortcuts.map((shortcut) => {
            const active = isCurrent(location.pathname, shortcut.href)
            return (
              <Link
                key={shortcut.href}
                to={shortcut.href}
                onClick={close}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'os-mobile-dock-item relative flex min-h-22 flex-col items-center justify-center gap-1.5 border-3 border-transparent p-2.5 text-center text-xs font-black tracking-wide text-foreground uppercase hover:border-border hover:bg-background',
                  active && 'is-active border-border bg-primary shadow-os-sm',
                )}
              >
                <span className="shortcut-art os-mobile-dock-art grid size-10 place-items-center border-3 border-border bg-card text-2xl shadow-os-sm" aria-hidden="true">
                  <PixelIcon glyph={shortcut.glyph} />
                </span>
                <span className="os-mobile-dock-label leading-tight">{shortcut.label}</span>
                {active ? <span className="os-mobile-dock-current text-xs font-black tracking-widest text-success">OPEN</span> : null}
              </Link>
            )
          })}
        </nav>
      </DrawerContent>
    </Drawer>
  )
}
