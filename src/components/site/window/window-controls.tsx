import { Link } from '@tanstack/react-router'
import { cn } from "cn"
import { useIsMobile } from '@/components/hooks/use-mobile'
import type { WindowMode } from '@/lib/os-store'
import { closeWindow, toggleMaximizeWindow, toggleMinimizeWindow } from '@/lib/os-store'

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

const controlClass =
  'grid size-6 place-items-center border-2 border-border bg-transparent p-0 align-middle font-mono text-base leading-none font-black text-foreground hover:bg-accent'

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
    <span className="window-controls inline-flex items-center gap-1.5 text-base leading-none" aria-label="Window controls">
      {showMinimize ? (
        <button
          aria-label={`${windowMode === 'minimized' ? 'Restore' : 'Minimize'} ${title}`}
          className={cn(controlClass, 'window-control')}
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
          className={cn(controlClass, 'window-control')}
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
          className={cn(controlClass, 'window-close')}
          onClick={() => closeWindow(windowId)}
          to={closeHref}
        >
          ×
        </Link>
      ) : null}
    </span>
  )
}
