import { Link, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Drawer, DrawerContent, DrawerTitle } from '../ui/drawer'
import { PixelIcon } from './pixel-icon'

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
      <DrawerContent id="mobile-nav-drawer" className="os-mobile-nav-content" aria-label="Site navigation">
        <DrawerTitle className="os-mobile-nav-title">
          <PixelIcon glyph="◆" /> NAVIGATE
        </DrawerTitle>
        <nav className="os-mobile-dock-grid" aria-label="Site shortcuts">
          {mobileNavShortcuts.map((shortcut) => {
            const active = isCurrent(location.pathname, shortcut.href)
            return (
              <Link
                key={shortcut.href}
                to={shortcut.href}
                onClick={close}
                aria-current={active ? 'page' : undefined}
                className={`os-mobile-dock-item${active ? ' is-active' : ''}`}
              >
                <span className="shortcut-art os-mobile-dock-art" aria-hidden="true">
                  <PixelIcon glyph={shortcut.glyph} />
                </span>
                <span className="os-mobile-dock-label">{shortcut.label}</span>
                {active ? <span className="os-mobile-dock-current">OPEN</span> : null}
              </Link>
            )
          })}
        </nav>
      </DrawerContent>
    </Drawer>
  )
}
