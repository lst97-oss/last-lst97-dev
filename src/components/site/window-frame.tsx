import { Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { WindowFrameControls } from '@/components/site/window/window-controls'
import { WindowControls } from '@/components/site/window/window-controls'
import { ScrollArea } from '@/components/ui/scroll-area'
import { focusWindow, osStore } from '@/lib/os-store'

export type { WindowFrameControls } from '@/components/site/window/window-controls'

type WindowFrameProps = {
  title: string
  icon?: string
  children: ReactNode
  /**
   * Previous-page control rendered in the title bar, before the title. Narrowed
   * to the four in-app destinations the content windows link to so the typed
   * router `to` prop keeps its literal-union inference.
   */
  backLink?: { href: '/' | '/blog' | '/changelog' | '/projects'; label: string }
  closeHref?: string
  windowId?: string
  className?: string
  controls?: WindowFrameControls
  /**
   * Scroll the children through a themed ScrollArea instead of letting
   * `.window-content` overflow natively. Self-sufficient: it also applies the
   * `.window-frame--scroll` height cap, so a caller only opts in here and never
   * has to remember a matching CSS class.
   *
   * This is deliberately NOT switched off on mobile. The shell root is
   * `h-dvh overflow-hidden`, so a window whose content is taller than the
   * viewport has nowhere else to scroll: the page cannot grow, and the inner
   * scroller is the only thing that can. Skipping it made every long detail
   * page unreachable on a phone — the content simply ran off the bottom of a
   * clipped shell.
   */
  scrollable?: boolean
  /**
   * Pinned content rendered below the ScrollArea, outside its scrollable
   * viewport. Used by chat to keep the composer reachable while the
   * transcript scrolls. Ignored unless `scrollable` is set, because there is
   * no separate scroller to keep it out of.
   */
  footer?: ReactNode
}

export function WindowFrame({
  title,
  icon = '▣',
  backLink,
  children,
  closeHref = '/',
  windowId = title,
  className = '',
  controls,
  scrollable = false,
  footer,
}: WindowFrameProps) {
  const windowMode = useStore(osStore, (state) => state.windowModes[windowId] ?? 'normal')
  const isActive = useStore(osStore, (state) => state.activeWindowId === windowId)
  const isMobile = useIsMobile()
  // Mobile never uses zoomed/minimized window states; render as a plain stacked card.
  const effectiveMode = isMobile ? 'normal' : windowMode
  const activate = () => focusWindow(windowId)
  // See the `scrollable` prop's doc for why this stays on at every width.
  const useThemedScroll = scrollable
  // A maximized window is `position: fixed` over a document the root lock has
  // already frozen, and its content box was the one thing that could scroll —
  // via `overflow: auto`, which paints the browser's own scrollbar. Every
  // maximized window therefore gets the themed viewport whether or not it opts
  // into `scrollable`. The `.window-frame--scroll` class and its height cap stay
  // tied to the prop, because those describe the in-flow normal state, not the
  // fixed maximized one.
  const themedContent = useThemedScroll || effectiveMode === 'maximized'

  return (
    <section
      className={cn(
        'window-frame overflow-hidden border-3 border-border bg-card shadow-os',
        isActive && !isMobile && 'is-active',
        `is-${effectiveMode}`,
        useThemedScroll && 'window-frame--scroll',
        className,
      )}
      data-window-id={windowId}
      onFocusCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('.window-controls')) return
        activate()
      }}
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest('.window-controls')) return
        activate()
      }}
    >
      <div className="window-titlebar flex min-h-9 items-center justify-between gap-3 border-b-3 border-border bg-primary px-2 py-1 pl-3 text-xs font-black tracking-widest text-foreground uppercase">
        <div className="inline-flex min-w-0 items-center gap-3 overflow-hidden">
          {backLink ? (
            <Link aria-label={backLink.label} className="window-back shrink-0 whitespace-nowrap" to={backLink.href}>
              {backLink.label}
            </Link>
          ) : null}
          <span className="window-title inline-flex min-w-0 items-center gap-2">
            <PixelIcon glyph={icon} className="text-foreground" />
            <span className="truncate">{title}</span>
          </span>
        </div>
        <WindowControls
          closeHref={closeHref}
          controls={controls}
          title={title}
          windowId={windowId}
          windowMode={effectiveMode}
        />
      </div>
      <div
        className={cn('window-content p-6 sm:p-8 lg:p-12', themedContent && 'window-content--scroll')}
        aria-hidden={effectiveMode === 'minimized'}
      >
        {themedContent ? (
          <ScrollArea
            className="min-h-0 min-w-0 flex-1"
            viewportProps={{ className: 'px-6 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12' }}
          >
            {children}
          </ScrollArea>
        ) : (
          children
        )}
        {useThemedScroll && footer ? (
          <div className="window-footer shrink-0 border-t-3 border-border bg-card px-4 py-2 sm:px-5">{footer}</div>
        ) : null}
      </div>
    </section>
  )
}
