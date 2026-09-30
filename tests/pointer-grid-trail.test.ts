import { describe, expect, test } from 'bun:test'

import {
  GRID_TRAIL_MAX_ALPHA,
  GRID_TRAIL_STEP_MS,
  GRID_TRAIL_STEPS,
  ageTrail,
  cellAt,
  lightTrail,
  trailAlpha,
  trailKey,
  type TrailField,
} from '../src/components/site/battle/pointer-grid-trail'

function lit(): TrailField {
  return new Map()
}

describe('pointer grid trail field', () => {
  test('lights a connected path, not a single cell', () => {
    const horizontal = lit()
    lightTrail(horizontal, 40, 0, 0, 3, 0)
    expect(horizontal.size).toBe(4)
    expect([...horizontal.values()].every((steps) => steps === GRID_TRAIL_STEPS)).toBe(true)

    const diagonal = lit()
    lightTrail(diagonal, 40, 0, 0, 2, 2)
    expect(diagonal.size).toBe(3)
    expect(diagonal.has(trailKey(0, 0, 40))).toBe(true)
    expect(diagonal.has(trailKey(1, 1, 40))).toBe(true)
    expect(diagonal.has(trailKey(2, 2, 40))).toBe(true)
  })

  test('re-lighting a lit cell resets its remaining life', () => {
    const field = lit()
    lightTrail(field, 40, 5, 5, 5, 5)
    ageTrail(field)
    ageTrail(field)
    expect(field.get(trailKey(5, 5, 40))).toBe(GRID_TRAIL_STEPS - 2)

    lightTrail(field, 40, 5, 5, 5, 5)
    expect(field.get(trailKey(5, 5, 40))).toBe(GRID_TRAIL_STEPS)
  })

  test('ages every cell one dim step and deletes the cell at zero', () => {
    const field = lit()
    const key = trailKey(2, 3, 40)
    lightTrail(field, 40, 2, 3, 2, 3)

    for (let step = 1; step < GRID_TRAIL_STEPS; step += 1) {
      ageTrail(field)
      expect(field.get(key)).toBe(GRID_TRAIL_STEPS - step)
    }
    ageTrail(field)
    expect(field.size).toBe(0)
    expect(field.has(key)).toBe(false)
  })

  test('dims monotonically and lives for one second', () => {
    expect(trailAlpha(GRID_TRAIL_STEPS)).toBeCloseTo(GRID_TRAIL_MAX_ALPHA, 6)
    for (let steps = GRID_TRAIL_STEPS; steps > 1; steps -= 1) {
      expect(trailAlpha(steps - 1)).toBeLessThan(trailAlpha(steps))
    }
    expect(GRID_TRAIL_STEPS * GRID_TRAIL_STEP_MS).toBe(1000)
  })

  test('maps pointer coordinates to cells and clamps negatives', () => {
    expect(cellAt(0, 0)).toEqual({ col: 0, row: 0 })
    expect(cellAt(33, 65)).toEqual({ col: 1, row: 2 })
    expect(cellAt(-40, -40)).toEqual({ col: 0, row: 0 })
  })
})
