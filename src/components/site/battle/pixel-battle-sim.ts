// Pure auto-battle simulation for the site background. No DOM access here:
// the state is plain data advanced one second at a time by battleTick, and
// the canvas renderer in pixel-battle-background.tsx visualizes it.

export type BattleTeam = 'blue' | 'red' | 'green'
export type BattleUnitKind = 'melee' | 'ranged'

export interface BattleUnit {
  id: number
  team: BattleTeam
  kind: BattleUnitKind
  col: number
  row: number
  hp: number
  cooldown: number
  /** Radians a ranged unit is aiming at; set whenever it has a target. */
  facing: number
  /** Increments on every successful attack; the renderer plays a spin off it. */
  attackSeq: number
}

export interface BattleLaserEvent {
  team: BattleTeam
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
}

export interface BattleCaps {
  melee: number
  ranged: number
}

export interface BattleState {
  cols: number
  rows: number
  units: BattleUnit[]
  nextId: number
  rngState: number
}

export const BATTLE_CELL_PX = 32
export const BATTLE_TICK_MS = 1000
export const BATTLE_LASER_TTL_SEC = 0.3
/** Per-team caps: 40 soldiers × 3 teams keeps the 120-unit total unchanged. */
export const BATTLE_MAX_MELEE_PER_TEAM = 33
export const BATTLE_MAX_RANGED_PER_TEAM = 7
export const BATTLE_MELEE_RANGE = 1
export const BATTLE_RANGED_RANGE = 10
export const BATTLE_MELEE_HP = 30
export const BATTLE_MELEE_DAMAGE = 4
export const BATTLE_MELEE_COOLDOWN_TICKS = 1
export const BATTLE_RANGED_HP = 20
export const BATTLE_RANGED_DAMAGE = 12
export const BATTLE_RANGED_COOLDOWN_TICKS = 5
export const BATTLE_RESPAWNS_PER_TICK_PER_TEAM = 2

const BATTLE_SEED = 0xB47E1

function nextRandom(state: BattleState): number {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0
  let t = state.rngState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Grid (Chebyshev) distance: adjacent includes diagonals, matching 8-way movement. */
export function battleDistance(fromCol: number, fromRow: number, toCol: number, toRow: number): number {
  return Math.max(Math.abs(toCol - fromCol), Math.abs(toRow - fromRow))
}

/** Unit counts per team, scaled by viewport grid area so small screens field fewer soldiers. */
export function battleCaps(cols: number, rows: number): BattleCaps {
  const scale = Math.min(1, Math.max(0.15, (cols * rows) / 2040))
  return {
    melee: Math.max(5, Math.round(BATTLE_MAX_MELEE_PER_TEAM * scale)),
    ranged: Math.max(1, Math.round(BATTLE_MAX_RANGED_PER_TEAM * scale)),
  }
}

/** Home corner per team: blue top-left, red bottom-right, green top-right. */
export function battleCorner(team: BattleTeam, cols: number, rows: number): { col: number; row: number } {
  if (team === 'blue') return { col: 0, row: 0 }
  if (team === 'red') return { col: cols - 1, row: rows - 1 }
  return { col: cols - 1, row: 0 }
}

/** Territory for initial scatter: whichever home corner is closest (ties go blue, red, green). */
function homeTerritory(col: number, row: number, cols: number, rows: number): BattleTeam {
  const distSq = (corner: { col: number; row: number }) =>
    (col - corner.col) * (col - corner.col) + (row - corner.row) * (row - corner.row)
  const blue = distSq(battleCorner('blue', cols, rows))
  const red = distSq(battleCorner('red', cols, rows))
  const green = distSq(battleCorner('green', cols, rows))
  if (blue <= red && blue <= green) return 'blue'
  if (red <= green) return 'red'
  return 'green'
}

/** Score bonus (in cells) for targeting an enemy ranged unit: counter-battery fire. */
const RANGED_TARGET_BONUS = 4
/** Max blockers on the line for a ranged unit to chase instead of holding. */
const CHASE_MAX_BLOCKERS = 2
/** Nearest-enemy distance at which a cooling-down ranged unit falls back. */
const THREAT_RANGE = 2
/** Score penalty per unit standing on the line between shooter and target. */
const BLOCKER_WEIGHT = 1.5

function countUnitsBetween(
  occupied: Set<string>,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): number {
  let count = 0
  let x = fromCol
  let y = fromRow
  const dx = Math.abs(toCol - x)
  const dy = Math.abs(toRow - y)
  const stepX = x < toCol ? 1 : -1
  const stepY = y < toRow ? 1 : -1
  let err = dx - dy
  while (x !== toCol || y !== toRow) {
    const err2 = 2 * err
    if (err2 > -dy) {
      err -= dy
      x += stepX
    }
    if (err2 < dx) {
      err += dx
      y += stepY
    }
    if (x === toCol && y === toRow) break
    if (occupied.has(cellKey(x, y))) count += 1
  }
  return count
}

/**
 * Pick a target. Ranged shooters get absolute counter-battery priority: the
 * nearest enemy ranged unit already inside firing range on a clear line
 * (at most CHASE_MAX_BLOCKERS between) wins outright. Everything else —
 * crowded lines, melee shooters, movement targets — falls back to effective
 * distance scoring below. Ties break by lowest id for determinism.
 */
export function selectTarget(units: BattleUnit[], unit: BattleUnit): BattleUnit | null {
  const occupied = new Set(units.map((candidate) => cellKey(candidate.col, candidate.row)))
  if (unit.kind === 'ranged') {
    let battery: BattleUnit | null = null
    let batteryDist = Infinity
    for (const candidate of units) {
      if (candidate.team === unit.team || candidate.kind !== 'ranged') continue
      const distance = battleDistance(unit.col, unit.row, candidate.col, candidate.row)
      if (distance > BATTLE_RANGED_RANGE) continue
      if (countUnitsBetween(occupied, unit.col, unit.row, candidate.col, candidate.row) > CHASE_MAX_BLOCKERS) continue
      if (distance < batteryDist || (distance === batteryDist && battery !== null && candidate.id < battery.id)) {
        battery = candidate
        batteryDist = distance
      }
    }
    if (battery !== null) return battery
  }
  let best: BattleUnit | null = null
  let bestScore = Infinity
  for (const candidate of units) {
    if (candidate.team === unit.team) continue
    const distance = battleDistance(unit.col, unit.row, candidate.col, candidate.row)
    const blockers = countUnitsBetween(occupied, unit.col, unit.row, candidate.col, candidate.row)
    const score = distance + blockers * BLOCKER_WEIGHT - (candidate.kind === 'ranged' ? RANGED_TARGET_BONUS : 0)
    if (score < bestScore || (score === bestScore && best !== null && candidate.id < best.id)) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

function spawnUnit(state: BattleState, team: BattleTeam, kind: BattleUnitKind, col: number, row: number): void {
  const maxCooldown = kind === 'melee' ? BATTLE_MELEE_COOLDOWN_TICKS : BATTLE_RANGED_COOLDOWN_TICKS
  state.units.push({
    id: state.nextId,
    team,
    kind,
    col,
    row,
    hp: kind === 'melee' ? BATTLE_MELEE_HP : BATTLE_RANGED_HP,
    cooldown: Math.floor(nextRandom(state) * (maxCooldown + 1)),
    facing: team === 'blue' ? 0 : team === 'red' ? Math.PI : Math.PI / 2,
    attackSeq: 0,
  })
  state.nextId += 1
}

function trySpawnNear(
  state: BattleState,
  team: BattleTeam,
  kind: BattleUnitKind,
  occupied: Set<string>,
  cornerCol: number,
  cornerRow: number,
): boolean {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const col = Math.min(state.cols - 1, Math.max(0, cornerCol + Math.floor((nextRandom(state) * 2 - 1) * 6)))
    const row = Math.min(state.rows - 1, Math.max(0, cornerRow + Math.floor((nextRandom(state) * 2 - 1) * 6)))
    if (occupied.has(cellKey(col, row))) continue
    spawnUnit(state, team, kind, col, row)
    occupied.add(cellKey(col, row))
    return true
  }
  return false
}

function scatterInitialSide(state: BattleState, team: BattleTeam, caps: BattleCaps, occupied: Set<string>): void {
  const placements: BattleUnitKind[] = [
    ...Array<BattleUnitKind>(caps.melee).fill('melee'),
    ...Array<BattleUnitKind>(caps.ranged).fill('ranged'),
  ]
  for (const kind of placements) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const col = Math.floor(nextRandom(state) * state.cols)
      const row = Math.floor(nextRandom(state) * state.rows)
      if (homeTerritory(col, row, state.cols, state.rows) !== team) continue
      if (occupied.has(cellKey(col, row))) continue
      spawnUnit(state, team, kind, col, row)
      occupied.add(cellKey(col, row))
      break
    }
  }
}

export function createBattle(cols: number, rows: number, seed: number = BATTLE_SEED): BattleState {
  const state: BattleState = { cols, rows, units: [], nextId: 1, rngState: seed }
  const caps = battleCaps(cols, rows)
  const occupied = new Set<string>()
  scatterInitialSide(state, 'blue', caps, occupied)
  scatterInitialSide(state, 'red', caps, occupied)
  scatterInitialSide(state, 'green', caps, occupied)
  return state
}

/** Refill losses gradually so reinforcements trickle in instead of popping. */
function reinforce(state: BattleState, occupied: Set<string>): void {
  const caps = battleCaps(state.cols, state.rows)
  for (const team of ['blue', 'red', 'green'] as const) {
    const corner = battleCorner(team, state.cols, state.rows)
    for (const kind of ['melee', 'ranged'] as const) {
      const cap = kind === 'melee' ? caps.melee : caps.ranged
      const alive = state.units.filter((unit) => unit.team === team && unit.kind === kind).length
      const missing = Math.min(cap - alive, BATTLE_RESPAWNS_PER_TICK_PER_TEAM)
      for (let i = 0; i < missing; i += 1) {
        trySpawnNear(state, team, kind, occupied, corner.col, corner.row)
      }
    }
  }
}

const DIRECTION_ORDER: Array<[number, number]> = [
  [1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1],
]

function closestEnemy(units: BattleUnit[], unit: BattleUnit): { enemy: BattleUnit; dist: number } | null {
  let best: BattleUnit | null = null
  let bestDist = Infinity
  for (const candidate of units) {
    if (candidate.team === unit.team) continue
    const dist = battleDistance(unit.col, unit.row, candidate.col, candidate.row)
    if (dist < bestDist || (dist === bestDist && best !== null && candidate.id < best.id)) {
      best = candidate
      bestDist = dist
    }
  }
  return best === null ? null : { enemy: best, dist: bestDist }
}

function stepAway(state: BattleState, unit: BattleUnit, threat: BattleUnit, occupied: Set<string>): void {
  const current = battleDistance(unit.col, unit.row, threat.col, threat.row)
  const preference = unit.id % DIRECTION_ORDER.length
  let best: { col: number; row: number; dist: number; manh: number; rank: number } | null = null
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue
      const col = unit.col + dx
      const row = unit.row + dy
      if (col < 0 || row < 0 || col >= state.cols || row >= state.rows) continue
      if (occupied.has(cellKey(col, row))) continue
      const dist = battleDistance(col, row, threat.col, threat.row)
      if (dist <= current) continue
      const manh = Math.abs(threat.col - col) + Math.abs(threat.row - row)
      const order = DIRECTION_ORDER.findIndex(([ox, oy]) => ox === dx && oy === dy)
      const rank = (order - preference + DIRECTION_ORDER.length) % DIRECTION_ORDER.length
      if (
        best === null ||
        dist > best.dist ||
        (dist === best.dist && manh > best.manh) ||
        (dist === best.dist && manh === best.manh && rank < best.rank)
      ) {
        best = { col, row, dist, manh, rank }
      }
    }
  }
  if (!best) return
  occupied.delete(cellKey(unit.col, unit.row))
  unit.col = best.col
  unit.row = best.row
  occupied.add(cellKey(best.col, best.row))
}

function stepToward(state: BattleState, unit: BattleUnit, target: BattleUnit, occupied: Set<string>): void {
  const current = battleDistance(unit.col, unit.row, target.col, target.row)
  // Rank every free neighbor by closeness to the target so a unit blocked by
  // an ally sidesteps around instead of queuing behind it. Sidesteps (equal
  // distance) are allowed; retreats (worse distance) never are. Ties fan out
  // by unit id so a queued line spreads instead of stacking.
  const preference = unit.id % DIRECTION_ORDER.length
  let best: { col: number; row: number; dist: number; manh: number; rank: number } | null = null
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue
      const col = unit.col + dx
      const row = unit.row + dy
      if (col < 0 || row < 0 || col >= state.cols || row >= state.rows) continue
      if (occupied.has(cellKey(col, row))) continue
      const dist = battleDistance(col, row, target.col, target.row)
      if (dist > current) continue
      const manh = Math.abs(target.col - col) + Math.abs(target.row - row)
      const order = DIRECTION_ORDER.findIndex(([ox, oy]) => ox === dx && oy === dy)
      const rank = (order - preference + DIRECTION_ORDER.length) % DIRECTION_ORDER.length
      if (
        best === null ||
        dist < best.dist ||
        (dist === best.dist && manh < best.manh) ||
        (dist === best.dist && manh === best.manh && rank < best.rank)
      ) {
        best = { col, row, dist, manh, rank }
      }
    }
  }
  if (!best) return
  occupied.delete(cellKey(unit.col, unit.row))
  unit.col = best.col
  unit.row = best.row
  occupied.add(cellKey(best.col, best.row))
}

/**
 * Advance the simulation one decision round (1 second). Every unit either
 * attacks a target in range or steps one cell toward its nearest enemy.
 * Returns laser visuals for ranged attacks; lasers pass through everything.
 */
export function battleTick(state: BattleState): BattleLaserEvent[] {
  const events: BattleLaserEvent[] = []
  const occupied = new Set(state.units.map((unit) => cellKey(unit.col, unit.row)))

  for (const unit of state.units) {
    if (unit.cooldown > 0) unit.cooldown -= 1
    const target = selectTarget(state.units, unit)
    if (!target) continue
    const range = unit.kind === 'melee' ? BATTLE_MELEE_RANGE : BATTLE_RANGED_RANGE
    const dist = battleDistance(unit.col, unit.row, target.col, target.row)
    if (unit.kind === 'ranged') {
      unit.facing = Math.atan2(target.row - unit.row, target.col - unit.col)
    }
    if (dist <= range && unit.cooldown === 0) {
      target.hp -= unit.kind === 'melee' ? BATTLE_MELEE_DAMAGE : BATTLE_RANGED_DAMAGE
      unit.cooldown = unit.kind === 'melee' ? BATTLE_MELEE_COOLDOWN_TICKS : BATTLE_RANGED_COOLDOWN_TICKS
      unit.attackSeq += 1
      if (unit.kind === 'ranged') {
        events.push({ team: unit.team, fromCol: unit.col, fromRow: unit.row, toCol: target.col, toRow: target.row })
      }
    }
    if (unit.kind === 'melee') {
      if (dist > range) stepToward(state, unit, target, occupied)
      continue
    }
    // Ranged footwork: fall back from close threats while cooling down, chase
    // exposed enemy ranged units instead of holding, otherwise hold or advance.
    const threat = closestEnemy(state.units, unit)
    if (threat !== null && threat.dist <= THREAT_RANGE) {
      stepAway(state, unit, threat.enemy, occupied)
      continue
    }
    if (target.kind === 'ranged' && dist > 1) {
      const blockers = countUnitsBetween(occupied, unit.col, unit.row, target.col, target.row)
      if (blockers <= CHASE_MAX_BLOCKERS) {
        stepToward(state, unit, target, occupied)
        continue
      }
    }
    if (dist > range) stepToward(state, unit, target, occupied)
  }

  state.units = state.units.filter((unit) => unit.hp > 0)
  reinforce(state, occupied)
  return events
}

/** Shrink a live battle to a new viewport: drop out-of-bounds units, trim to caps. */
export function resizeBattle(state: BattleState, cols: number, rows: number): void {
  state.cols = cols
  state.rows = rows
  state.units = state.units.filter((unit) => unit.col < cols && unit.row < rows)
  const caps = battleCaps(cols, rows)
  for (const team of ['blue', 'red', 'green'] as const) {
    for (const kind of ['melee', 'ranged'] as const) {
      const cap = kind === 'melee' ? caps.melee : caps.ranged
      const matching = state.units.filter((unit) => unit.team === team && unit.kind === kind)
      if (matching.length <= cap) continue
      const keep = new Set(matching.slice(0, cap).map((unit) => unit.id))
      state.units = state.units.filter((unit) => unit.team !== team || unit.kind !== kind || keep.has(unit.id))
    }
  }
}
