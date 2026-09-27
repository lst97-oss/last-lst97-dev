import { createStore } from '@tanstack/store'

export type WindowMode = 'normal' | 'minimized' | 'maximized'

export type OsState = {
  activeWindowId: string | null
  windowModes: Record<string, WindowMode>
}

const initialOsState: OsState = {
  activeWindowId: null,
  windowModes: {},
}

export const osStore = createStore<OsState>(initialOsState)

export function focusWindow(windowId: string): void {
  osStore.setState((state) => ({
    activeWindowId: windowId,
    windowModes: {
      ...state.windowModes,
      [windowId]: state.windowModes[windowId] === 'minimized' ? 'normal' : state.windowModes[windowId] ?? 'normal',
    },
  }))
}

export function toggleMinimizeWindow(windowId: string): void {
  osStore.setState((state) => {
    const currentMode = state.windowModes[windowId] ?? 'normal'
    const nextMode: WindowMode = currentMode === 'minimized' ? 'normal' : 'minimized'
    const nextActiveWindowId = nextMode === 'minimized'
      ? state.activeWindowId === windowId ? null : state.activeWindowId
      : windowId

    return {
      activeWindowId: nextActiveWindowId,
      windowModes: { ...state.windowModes, [windowId]: nextMode },
    }
  })
}

export function toggleMaximizeWindow(windowId: string): void {
  osStore.setState((state) => {
    const currentMode = state.windowModes[windowId] ?? 'normal'
    const nextMode: WindowMode = currentMode === 'maximized' ? 'normal' : 'maximized'

    return {
      activeWindowId: windowId,
      windowModes: { ...state.windowModes, [windowId]: nextMode },
    }
  })
}

export function closeWindow(windowId: string): void {
  osStore.setState((state) => {
    const windowModes = { ...state.windowModes }
    delete windowModes[windowId]

    return {
      activeWindowId: state.activeWindowId === windowId ? null : state.activeWindowId,
      windowModes,
    }
  })
}

export function resetOsState(): void {
  osStore.setState(() => ({
    activeWindowId: initialOsState.activeWindowId,
    windowModes: {},
  }))
}
