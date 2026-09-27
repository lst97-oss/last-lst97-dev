import { beforeEach, describe, expect, test } from 'bun:test'

import {
  closeWindow,
  focusWindow,
  osStore,
  resetOsState,
  toggleMaximizeWindow,
  toggleMinimizeWindow,
} from '../src/lib/os-store'

describe('desktop OS store', () => {
  beforeEach(() => resetOsState())

  test('tracks active windows and restores minimized windows when focused', () => {
    focusWindow('blog.app')
    expect(osStore.state).toEqual({ activeWindowId: 'blog.app', windowModes: { 'blog.app': 'normal' } })

    toggleMinimizeWindow('blog.app')
    expect(osStore.state.activeWindowId).toBeNull()
    expect(osStore.state.windowModes['blog.app']).toBe('minimized')

    focusWindow('blog.app')
    expect(osStore.state).toEqual({ activeWindowId: 'blog.app', windowModes: { 'blog.app': 'normal' } })
  })

  test('supports maximize and close transitions', () => {
    focusWindow('projects.app')
    toggleMaximizeWindow('projects.app')
    expect(osStore.state.windowModes['projects.app']).toBe('maximized')

    toggleMaximizeWindow('projects.app')
    expect(osStore.state.windowModes['projects.app']).toBe('normal')

    closeWindow('projects.app')
    expect(osStore.state).toEqual({ activeWindowId: null, windowModes: {} })
  })

  test('keeps the focused window when a background window is minimized', () => {
    focusWindow('home.app')
    focusWindow('chat.app')
    toggleMinimizeWindow('home.app')

    expect(osStore.state.activeWindowId).toBe('chat.app')
    expect(osStore.state.windowModes['home.app']).toBe('minimized')
  })
})
