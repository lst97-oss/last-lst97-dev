import { useStore } from '@tanstack/react-store'
import type { ReactNode } from 'react'
import { focusWindow, osStore } from '../../lib/os-store'
import { useIsMobile } from '../hooks/use-mobile'
import { PixelIcon } from './pixel-icon'
import type { WindowFrameControls } from './window/window-controls'
import { WindowControls } from './window/window-controls'

export type { WindowFrameControls } from './window/window-controls'

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
      className={`window-frame ${isActive && !isMobile ? 'is-active' : ''} is-${effectiveMode} ${className}`.trim()}
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
      <div className="window-titlebar">
        <span className="window-title">
          <PixelIcon glyph={icon} />
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
      <div className="window-content" aria-hidden={effectiveMode === 'minimized'}>{children}</div>
    </section>
  )
}
