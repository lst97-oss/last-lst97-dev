import { useStore } from '@tanstack/react-store'
import { cn } from "cn"
import type { ReactNode } from 'react'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { WindowFrameControls } from '@/components/site/window/window-controls'
import { WindowControls } from '@/components/site/window/window-controls'
import { focusWindow, osStore } from '@/lib/os-store'

export type { WindowFrameControls } from '@/components/site/window/window-controls'

type WindowFrameProps = {
  title: string
  icon?: string
  children: ReactNode
  closeHref?: string
  windowId?: string
  className?: string
  controls?: WindowFrameControls
}

export function WindowFrame({
  title,
  icon = '▣',
  children,
  closeHref = '/',
  windowId = title,
  className = '',
  controls,
}: WindowFrameProps) {
  const windowMode = useStore(osStore, (state) => state.windowModes[windowId] ?? 'normal')
  const isActive = useStore(osStore, (state) => state.activeWindowId === windowId)
  const isMobile = useIsMobile()
  // Mobile never uses zoomed/minimized window states; render as a plain stacked card.
  const effectiveMode = isMobile ? 'normal' : windowMode
  const activate = () => focusWindow(windowId)

  return (
    <section
      className={cn(
        'window-frame overflow-hidden border-3 border-border bg-card shadow-os',
        isActive && !isMobile && 'is-active',
        `is-${effectiveMode}`,
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
        <span className="window-title inline-flex items-center gap-2">
          <PixelIcon glyph={icon} className="text-foreground" />
          {title}
        </span>
        <WindowControls
          closeHref={closeHref}
          controls={controls}
          title={title}
          windowId={windowId}
          windowMode={effectiveMode}
        />
      </div>
      <div className="window-content p-6 sm:p-8 lg:p-12" aria-hidden={effectiveMode === 'minimized'}>{children}</div>
    </section>
  )
}
