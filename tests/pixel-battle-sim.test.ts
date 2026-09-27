import { describe, expect, test } from 'bun:test'

import {
  battleCaps,
  battleDistance,
  battleTick,
  createBattle,
  resizeBattle,
  type BattleState,
  type BattleTeam,
  type BattleUnitKind,
} from '../src/components/site/battle/pixel-battle-sim'

function emptyState(cols = 40, rows = 24): BattleState {
  return { cols, rows, units: [], nextId: 1, rngState: 12345 }
}

function addUnit(
  state: BattleState,
  team: BattleTeam,
  kind: BattleUnitKind,
  col: number,
  row: number,
  hp?: number,
): number {
  const id = state.nextId
  state.units.push({
    id,
    team,
    kind,
    col,
    row,
    hp: hp ?? (kind === 'melee' ? 30 : 20),
    cooldown: 0,
    facing: 0,
    attackSeq: 0,
  })
  state.nextId += 1
  return id
}

describe('pixel battle sim', () => {
  test('scales unit caps by screen size with a floor', () => {
    expect(battleCaps(60, 34)).toEqual({ melee: 33, ranged: 7 })
    expect(battleCaps(10, 8)).toEqual({ melee: 5, ranged: 1 })
    const total = battleCaps(100, 60)
    expect((total.melee + total.ranged) * 3).toBe(120)
  })

  test('fields three teams within the total unit cap', () => {
    const state = createBattle(60, 34)
    expect(state.units.length).toBeLessThanOrEqual(120)
    for (const team of ['blue', 'red', 'green'] as const) {
      expect(state.units.some((unit) => unit.team === team)).toBe(true)
    }
  })

  test('melee attacks diagonally adjacent enemies without moving', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 5, 5)
    const targetId = addUnit(state, 'red', 'melee', 6, 6)
    const events = battleTick(state)

    expect(events).toEqual([])
    const attacker = state.units.find((unit) => unit.team === 'blue')!
    const target = state.units.find((unit) => unit.id === targetId)!
    expect(attacker.col).toBe(5)
    expect(attacker.row).toBe(5)
    expect(target.hp).toBe(26)
    expect(attacker.cooldown).toBe(1)
    expect(attacker.attackSeq).toBe(1)
  })

  test('melee strikes every tick while engaged', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 5, 5)
    const targetId = addUnit(state, 'red', 'melee', 6, 5, 100)
    battleTick(state)
    battleTick(state)
    const attacker = state.units.find((unit) => unit.team === 'blue')!
    const target = state.units.find((unit) => unit.id === targetId)!
    expect(target.hp).toBe(100 - 8)
    expect(attacker.attackSeq).toBe(2)
  })

  test('units step diagonally toward distant enemies', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 2, 2)
    addUnit(state, 'red', 'melee', 8, 8)
    battleTick(state)
    const mover = state.units.find((unit) => unit.team === 'blue')!
    expect([mover.col, mover.row]).toEqual([3, 3])
  })

  test('ranged units fire within 10 cells and aim at the target', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    const targetId = addUnit(state, 'blue', 'melee', 10, 0)
    const events = battleTick(state)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ team: 'red', fromCol: 0, fromRow: 0, toCol: 10, toRow: 0 })
    const shooter = state.units.find((unit) => unit.team === 'red')!
    const target = state.units.find((unit) => unit.id === targetId)!
    expect(target.hp).toBe(18)
    expect(shooter.cooldown).toBe(5)
    expect(shooter.facing).toBeCloseTo(0, 5)
  })

  test('ranged units hold fire beyond 10 cells and during cooldown', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    addUnit(state, 'blue', 'melee', 11, 0)
    expect(battleTick(state)).toEqual([])
    const shooter = state.units.find((unit) => unit.team === 'red')!
    expect([shooter.col, shooter.row]).toEqual([1, 0])

    const close = emptyState()
    addUnit(close, 'red', 'ranged', 0, 0)
    addUnit(close, 'blue', 'melee', 5, 0, 100)
    expect(battleTick(close)).toHaveLength(1)
    expect(battleTick(close)).toEqual([])
  })

  test('lasers pass through intervening units without harming them', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    const bystanderId = addUnit(state, 'red', 'melee', 5, 0)
    const targetId = addUnit(state, 'blue', 'melee', 10, 0)
    battleTick(state)
    expect(state.units.find((unit) => unit.id === bystanderId)!.hp).toBe(30)
    expect(state.units.find((unit) => unit.id === targetId)!.hp).toBe(18)
  })

  test('dead units disappear and reinforcements spawn at the team corner', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 5, 5, 1)
    addUnit(state, 'red', 'melee', 5, 6)
    battleTick(state)
    const blue = state.units.filter((unit) => unit.team === 'blue')
    expect(blue.length).toBeGreaterThan(0)
    for (const unit of blue) {
      expect(unit.col).toBeLessThanOrEqual(6)
      expect(unit.row).toBeLessThanOrEqual(6)
    }
  })

  test('units never leave the screen', () => {
    const state = emptyState(8, 6)
    addUnit(state, 'blue', 'melee', 0, 0)
    addUnit(state, 'red', 'melee', 7, 5)
    for (let i = 0; i < 20; i += 1) battleTick(state)
    for (const unit of state.units) {
      expect(unit.col).toBeGreaterThanOrEqual(0)
      expect(unit.row).toBeGreaterThanOrEqual(0)
      expect(unit.col).toBeLessThan(state.cols)
      expect(unit.row).toBeLessThan(state.rows)
    }
  })

  test('resize drops out-of-bounds units and trims to caps', () => {
    const state = createBattle(40, 24)
    const before = state.units.length
    expect(before).toBeGreaterThan(0)
    resizeBattle(state, 10, 8)
    expect(state.cols).toBe(10)
    expect(state.rows).toBe(8)
    for (const unit of state.units) {
      expect(unit.col).toBeLessThan(10)
      expect(unit.row).toBeLessThan(8)
    }
    const caps = battleCaps(10, 8)
    for (const team of ['blue', 'red', 'green'] as const) {
      expect(state.units.filter((unit) => unit.team === team && unit.kind === 'melee').length)
        .toBeLessThanOrEqual(caps.melee)
      expect(state.units.filter((unit) => unit.team === team && unit.kind === 'ranged').length)
        .toBeLessThanOrEqual(caps.ranged)
    }
  })

  test('blocked units sidestep around allies instead of queuing', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 5, 5)
    addUnit(state, 'blue', 'melee', 6, 4)
    addUnit(state, 'blue', 'melee', 6, 5)
    addUnit(state, 'blue', 'melee', 6, 6)
    addUnit(state, 'red', 'melee', 9, 5)
    battleTick(state)
    const mover = state.units.find((unit) => unit.id === 1)!
    expect([mover.col, mover.row]).not.toEqual([5, 5])
    expect(battleDistance(mover.col, mover.row, 9, 5)).toBeLessThanOrEqual(4)
  })

  test('fully boxed units hold position instead of retreating', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 5, 5)
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue
        addUnit(state, 'blue', 'melee', 5 + dx, 5 + dy)
      }
    }
    addUnit(state, 'red', 'melee', 20, 5)
    battleTick(state)
    const mover = state.units.find((unit) => unit.id === 1)!
    expect([mover.col, mover.row]).toEqual([5, 5])
  })

  test('ranged units prefer exposed enemy ranged units over closer melee', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    addUnit(state, 'blue', 'melee', 3, 2)
    addUnit(state, 'blue', 'ranged', 6, 0)
    const events = battleTick(state)
    const redShot = events.find((event) => event.team === 'red')
    expect(redShot).toMatchObject({ toCol: 6, toRow: 0 })
  })

  test('crowded lines fall back to the closer unit', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    addUnit(state, 'blue', 'melee', 2, 0)
    addUnit(state, 'blue', 'melee', 3, 0)
    addUnit(state, 'blue', 'melee', 4, 0)
    addUnit(state, 'blue', 'melee', 5, 0)
    addUnit(state, 'blue', 'ranged', 6, 0)
    const events = battleTick(state)
    const redShot = events.find((event) => event.team === 'red')
    expect(redShot).toMatchObject({ toCol: 2, toRow: 0 })
  })

  test('melee dives past adjacent enemies toward an exposed ranged unit', () => {
    const state = emptyState()
    addUnit(state, 'blue', 'melee', 5, 5)
    const holderId = addUnit(state, 'red', 'melee', 6, 5)
    addUnit(state, 'red', 'ranged', 9, 9)
    battleTick(state)
    const diver = state.units.find((unit) => unit.team === 'blue')!
    expect([diver.col, diver.row]).toEqual([6, 6])
    expect(state.units.find((unit) => unit.id === holderId)!.hp).toBe(30)
  })

  test('ranged units chase exposed enemy ranged units instead of holding', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    addUnit(state, 'blue', 'ranged', 6, 0)
    const events = battleTick(state)
    const redShot = events.find((event) => event.team === 'red')
    expect(redShot).toMatchObject({ toCol: 6, toRow: 0 })
    const chaser = state.units.find((unit) => unit.team === 'red')!
    expect([chaser.col, chaser.row]).toEqual([1, 0])
  })

  test('ranged units hold a crowded line instead of chasing', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 0, 0)
    addUnit(state, 'red', 'melee', 3, 0)
    addUnit(state, 'red', 'melee', 4, 0)
    addUnit(state, 'red', 'melee', 5, 0)
    addUnit(state, 'blue', 'ranged', 6, 0)
    const events = battleTick(state)
    const redShot = events.find((event) => event.team === 'red' && event.fromCol === 0)
    expect(redShot).toMatchObject({ toCol: 6, toRow: 0 })
    const holder = state.units.find((unit) => unit.team === 'red' && unit.kind === 'ranged')!
    expect([holder.col, holder.row]).toEqual([0, 0])
  })

  test('ranged units fall back while cooling down, then fire', () => {
    const state = emptyState()
    const runnerId = addUnit(state, 'red', 'ranged', 5, 5)
    addUnit(state, 'blue', 'melee', 7, 5)
    const runner = state.units.find((unit) => unit.id === runnerId)!
    runner.cooldown = 2

    const firstEvents = battleTick(state)
    expect(firstEvents.filter((event) => event.team === 'red')).toEqual([])
    const fled = state.units.find((unit) => unit.id === runnerId)!
    expect([fled.col, fled.row]).not.toEqual([5, 5])
    expect(battleDistance(fled.col, fled.row, 7, 5)).toBe(3)

    const secondEvents = battleTick(state)
    // Reinforcements arrived after tick 1, so the exact target is emergent —
    // what matters is the cooled-down unit fires instead of fleeing.
    expect(secondEvents.some((event) => event.team === 'red')).toBe(true)
  })

  test('ranged units fire and move in the same tick', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 5, 5)
    addUnit(state, 'blue', 'melee', 6, 5)
    const events = battleTick(state)
    const redShot = events.find((event) => event.team === 'red')
    expect(redShot).toMatchObject({ toCol: 6, toRow: 5 })
    const shooter = state.units.find((unit) => unit.team === 'red')!
    expect([shooter.col, shooter.row]).not.toEqual([5, 5])
    expect(battleDistance(shooter.col, shooter.row, 6, 5)).toBeGreaterThan(1)
  })

  test('a threatened chaser fires across the map while retreating', () => {
    const state = emptyState()
    addUnit(state, 'red', 'ranged', 5, 5)
    addUnit(state, 'blue', 'melee', 7, 6)
    addUnit(state, 'blue', 'ranged', 12, 5)
    const events = battleTick(state)
    const redShot = events.find((event) => event.team === 'red')
    expect(redShot).toMatchObject({ toCol: 12, toRow: 5 })
    const survivor = state.units.find((unit) => unit.team === 'red')!
    expect([survivor.col, survivor.row]).toEqual([4, 4])
  })

  test('green reinforcements spawn at the top-right corner', () => {
    const state = emptyState()
    addUnit(state, 'green', 'melee', 20, 12)
    battleTick(state)
    const spawned = state.units.filter((unit) => unit.team === 'green' && unit.id !== 1)
    expect(spawned.length).toBeGreaterThan(0)
    for (const unit of spawned) {
      expect(unit.col).toBeGreaterThanOrEqual(state.cols - 7)
      expect(unit.row).toBeLessThanOrEqual(5)
    }
  })

  test('chebyshev distance treats diagonals as one step', () => {
    expect(battleDistance(5, 5, 6, 6)).toBe(1)
    expect(battleDistance(0, 0, 10, 3)).toBe(10)
  })
})
