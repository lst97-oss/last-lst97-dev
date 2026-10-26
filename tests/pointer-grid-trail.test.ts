import { describe, expect, test } from 'bun:test'

import {
  cellAt,
  GRID_TRAIL_GROW_MS,
  GRID_TRAIL_HOLD_MS,
  GRID_TRAIL_PACE_MAX,
  GRID_TRAIL_PACE_MIN,
  GRID_TRAIL_SHRINK_MS,
  lightCell,
  lightTrail,
  pruneTrail,
  type TrailCell,
  type TrailField,
  type TrailStamp,
  trailKey,
  trailPace,
  trailScale,
} from '../src/components/site/battle/pointer-grid-trail'

function stamp(col: number, row: number, at: number): TrailStamp {
  return { col, row, at }
}

function litCell(pace: number, at = 0): TrailCell {
  const field: TrailField = new Map()
  lightCell(field, 0, at, pace)
  return field.get(0) as TrailCell
}

describe('pointer grid trail field', () => {
  test('lights the cells crossed, not the origin', () => {
    const horizontal: TrailField = new Map()
    lightTrail(horizontal, 40, stamp(0, 0, 0), stamp(3, 0, 30), 1)
    expect([...horizontal.keys()]).toEqual([trailKey(1, 0, 40), trailKey(2, 0, 40), trailKey(3, 0, 40)])

    const diagonal: TrailField = new Map()
    lightTrail(diagonal, 40, stamp(0, 0, 0), stamp(2, 2, 20), 1)
    expect([...diagonal.keys()]).toEqual([trailKey(1, 1, 40), trailKey(2, 2, 40)])
  })

  test('stamps each crossed cell with its share of the elapsed time', () => {
    const field: TrailField = new Map()
    lightTrail(field, 40, stamp(0, 0, 1000), stamp(4, 0, 1016), 1)
    expect([...field.values()].map((cell) => cell.bornAt)).toEqual([1004, 1008, 1012, 1016])
  })

  test('a flick erases at the pace it was drawn, a slow stroke at its own', () => {
    const flick: TrailField = new Map()
    lightTrail(flick, 40, stamp(0, 0, 1000), stamp(4, 0, 1016), 1)
    const flickErase = [...flick.values()].map((cell) => cell.eraseAt)
    expect(flickErase[0]).toBe(1004 + GRID_TRAIL_HOLD_MS)
    for (let i = 1; i < flickErase.length; i += 1) {
      expect(flickErase[i] - flickErase[i - 1]).toBe(4)
    }

    const slow: TrailField = new Map()
    lightCell(slow, trailKey(0, 0, 40), 0, 1)
    lightCell(slow, trailKey(1, 0, 40), 300, 1)
    const [first, second] = [...slow.values()]
    expect(second.eraseAt - first.eraseAt).toBe(300)
  })

  test('leaving a lit cell does not restamp it', () => {
    const field: TrailField = new Map()
    lightCell(field, trailKey(5, 5, 40), 100, 1)
    lightTrail(field, 40, stamp(5, 5, 100), stamp(6, 5, 300), 1)
    expect(field.get(trailKey(5, 5, 40))?.eraseAt).toBe(100 + GRID_TRAIL_HOLD_MS)
    expect(field.get(trailKey(6, 5, 40))?.bornAt).toBe(300)
  })

  test('a cell that erased while the cursor rested is not redrawn on the move away', () => {
    const field: TrailField = new Map()
    lightCell(field, trailKey(5, 5, 40), 0, 1)
    pruneTrail(field, 10_000)
    lightTrail(field, 40, stamp(5, 5, 9950), stamp(6, 5, 10_000), 1)
    expect(field.has(trailKey(5, 5, 40))).toBe(false)
    expect(field.has(trailKey(6, 5, 40))).toBe(true)
  })

  test('revisiting a holding cell keeps its zoom-in and holds from the latest visit', () => {
    const field: TrailField = new Map()
    lightCell(field, 0, 0, 1)
    lightCell(field, 0, 300, 2)
    const cell = field.get(0) as TrailCell
    expect(cell.bornAt).toBe(0)
    expect(cell.growMs).toBe(GRID_TRAIL_GROW_MS)
    expect(cell.eraseAt).toBe(300 + GRID_TRAIL_HOLD_MS)
    expect(cell.shrinkMs).toBe(GRID_TRAIL_SHRINK_MS / 2)
  })

  test('revisiting a shrinking cell pops it again', () => {
    const field: TrailField = new Map()
    lightCell(field, 0, 0, 1)
    lightCell(field, 0, 800, 1)
    expect((field.get(0) as TrailCell).bornAt).toBe(800)
  })

  test('pace follows pointer speed and is clamped', () => {
    expect(trailPace(32, 32)).toBe(1)
    expect(trailPace(200, 20)).toBe(GRID_TRAIL_PACE_MAX)
    expect(trailPace(1, 100)).toBe(GRID_TRAIL_PACE_MIN)
    expect(trailPace(0, 0)).toBe(GRID_TRAIL_PACE_MIN)
  })

  test('a fast stroke zooms in quicker than a slow one', () => {
    const fast = litCell(GRID_TRAIL_PACE_MAX)
    const slow = litCell(GRID_TRAIL_PACE_MIN)
    expect(trailScale(fast, 40)).toBeGreaterThan(trailScale(slow, 40))
    expect(trailScale(fast, GRID_TRAIL_GROW_MS / GRID_TRAIL_PACE_MAX)).toBeCloseTo(1, 6)
  })

  test('zooms in, holds at full size, then zooms out to nothing', () => {
    const cell = litCell(1)
    expect(trailScale(cell, 0)).toBe(0)
    expect(trailScale(cell, GRID_TRAIL_GROW_MS)).toBeCloseTo(1, 6)
    expect(trailScale(cell, GRID_TRAIL_HOLD_MS)).toBeCloseTo(1, 6)
    expect(trailScale(cell, GRID_TRAIL_HOLD_MS + GRID_TRAIL_SHRINK_MS)).toBe(0)

    let previous = 0
    for (let now = 0; now <= GRID_TRAIL_GROW_MS; now += 10) {
      const scale = trailScale(cell, now)
      expect(scale).toBeGreaterThanOrEqual(previous)
      previous = scale
    }

    previous = 1
    for (let now = GRID_TRAIL_HOLD_MS; now <= GRID_TRAIL_HOLD_MS + GRID_TRAIL_SHRINK_MS; now += 10) {
      const scale = trailScale(cell, now)
      expect(scale).toBeLessThanOrEqual(previous)
      previous = scale
    }
  })

  test('prunes each cell when its own zoom-out has finished', () => {
    const field: TrailField = new Map()
    lightCell(field, 0, 0, 0.5)
    lightCell(field, 1, 100, 2.5)

    pruneTrail(field, 900)
    expect([...field.keys()]).toEqual([0])
    pruneTrail(field, GRID_TRAIL_HOLD_MS + GRID_TRAIL_SHRINK_MS / 0.5)
    expect(field.size).toBe(0)
  })

  test('maps pointer coordinates to cells and clamps negatives', () => {
    expect(cellAt(0, 0)).toEqual({ col: 0, row: 0 })
    expect(cellAt(33, 65)).toEqual({ col: 1, row: 2 })
    expect(cellAt(-40, -40)).toEqual({ col: 0, row: 0 })
  })
})
