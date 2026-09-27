import { describe, expect, test } from 'bun:test'

import { updateOpenHeaderMenu } from '../src/lib/header-menu-state'

describe('header menu state', () => {
  test('switches to the newly opened menu and ignores a stale close from the previous menu', () => {
    const activeMenu = updateOpenHeaderMenu('Explore', 'Operator', true)

    expect(activeMenu).toBe('Operator')
    expect(updateOpenHeaderMenu(activeMenu, 'Explore', false)).toBe('Operator')
  })

  test('closes the active menu when it requests to close', () => {
    expect(updateOpenHeaderMenu('Connect', 'Connect', false)).toBeNull()
  })
})
