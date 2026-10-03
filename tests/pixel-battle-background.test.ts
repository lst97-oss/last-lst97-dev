import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { battleVisualsSettled, PixelBattleBackground } from '../src/components/site/battle/pixel-battle-background'
import type { BattleUnit } from '../src/components/site/battle/pixel-battle-sim'

function unit(overrides: Partial<BattleUnit> = {}): BattleUnit {
  return {
    id: 1,
    team: 'blue',
    kind: 'melee',
    col: 3,
    row: 4,
    hp: 30,
    cooldown: 0,
    facing: 0,
    attackSeq: 0,
    ...overrides,
  }
}

describe('battle backdrop efficiency', () => {
  test('sleeps only when every visual is at rest', () => {
    const settled = new Map([[1, { x: 3, y: 4, spinT: 0, seenSeq: 0 }]])
    expect(battleVisualsSettled(settled, [unit()], 0)).toBe(true)

    const gliding = new Map([[1, { x: 2.5, y: 4, spinT: 0, seenSeq: 0 }]])
    expect(battleVisualsSettled(gliding, [unit()], 0)).toBe(false)

    const spinning = new Map([[1, { x: 3, y: 4, spinT: 0.5, seenSeq: 1 }]])
    expect(battleVisualsSettled(spinning, [unit({ attackSeq: 1 })], 0)).toBe(false)

    expect(battleVisualsSettled(settled, [unit()], 1)).toBe(false)
    expect(battleVisualsSettled(new Map(), [unit()], 0)).toBe(false)
  })

  test('renders an inert backdrop canvas for server markup', () => {
    const markup = renderToStaticMarkup(createElement(PixelBattleBackground))
    expect(markup).toContain('<canvas')
    expect(markup).toContain('pixel-field')
    expect(markup).toContain('aria-hidden="true"')
  })

  test('is memoized so shell re-renders skip the canvas subtree', () => {
    expect((PixelBattleBackground as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
  })
})
