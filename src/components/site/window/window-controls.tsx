import { Link } from '@tanstack/react-router'
import type { WindowMode } from '../../../lib/os-store'
import { closeWindow, toggleMaximizeWindow, toggleMinimizeWindow } from '../../../lib/os-store'
import { useIsMobile } from '../../hooks/use-mobile'

export type WindowFrameControls = {
  minimize?: boolean
  maximize?: boolean
  close?: boolean
}

interface WindowControlsProps {
  title: string
  windowId: string
  windowMode: WindowMode
  closeHref: string
  controls?: WindowFrameControls
}

export function WindowControls({
  title,
  windowId,
  windowMode,
  closeHref,
  controls,
}: WindowControlsProps) {
  const isMobile = useIsMobile()
  // Mobile has no window chrome: all minimize / maximize / close controls removed.
  if (isMobile) return null
  const showMinimize = controls?.minimize !== false
  const showMaximize = controls?.maximize !== false
  const showClose = controls?.close !== false
  if (!showMinimize && !showMaximize && !showClose) return null

  return (
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
  )
}
