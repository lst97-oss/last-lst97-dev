import { Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import type { ReactNode } from 'react'

import { closeWindow, focusWindow, osStore, toggleMaximizeWindow, toggleMinimizeWindow } from '../../lib/os-store'
import { PixelIcon } from './pixel-icon'

export type WindowFrameControls = {
  minimize?: boolean
  maximize?: boolean
  close?: boolean
}

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
  const activate = () => focusWindow(windowId)
  const showMinimize = controls?.minimize !== false
  const showMaximize = controls?.maximize !== false
  const showClose = controls?.close !== false
  const showControls = showMinimize || showMaximize || showClose

  return (
    <section
      className={`window-frame ${isActive ? 'is-active' : ''} is-${windowMode} ${className}`.trim()}
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
        {showControls ? (
          <span className="window-controls" aria-label="Window controls">
            {showMinimize ? (
              <button
                aria-label={`${windowMode === 'minimized' ? 'Restore' : 'Minimize'} ${title}`}
                className="window-control"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleMinimizeWindow(windowId)
                }}
                type="button"
              >
                {windowMode === 'minimized' ? '▣' : '_'}
              </button>
            ) : null}
            {showMaximize ? (
              <button
                aria-label={`${windowMode === 'maximized' ? 'Restore' : 'Maximize'} ${title}`}
                aria-pressed={windowMode === 'maximized'}
                className="window-control"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleMaximizeWindow(windowId)
                }}
                type="button"
              >
                {windowMode === 'maximized' ? '❐' : '□'}
              </button>
            ) : null}
            {showClose ? (
              <Link
                aria-label={`Close ${title}`}
                className="window-close"
                onClick={() => closeWindow(windowId)}
                to={closeHref}
              >
                ×
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="window-content" aria-hidden={windowMode === 'minimized'}>{children}</div>
    </section>
  )
}
