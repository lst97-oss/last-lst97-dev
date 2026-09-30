/** Pure pointer-trail field for the site background. No DOM access here: the field is a
 *  Map of grid cell -> remaining dim steps, advanced one 0.25s step at a time, and the
 *  canvas renderer in pixel-battle-background.tsx paints it beneath the battle units. */

import { BATTLE_CELL_PX } from '@/components/site/battle/pixel-battle-sim'

// One dim step of the trail's life cycle.
export const GRID_TRAIL_STEP_MS = 250
// Steps a lit cell survives before it is deleted: 4 * 250ms = 1s of trail.
export const GRID_TRAIL_STEPS = 4
// Wash opacity of a freshly lit cell; alpha scales linearly down from here.
// Tuned against the brand yellow, which is far more luminous than the earlier teal.
export const GRID_TRAIL_MAX_ALPHA = 0.6

/** cell key -> remaining dim steps (1..GRID_TRAIL_STEPS) */
export type TrailField = Map<number, number>

export function trailKey(col: number, row: number, cols: number): number {
  return row * cols + col
}

export function cellAt(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.max(0, Math.floor(x / BATTLE_CELL_PX)),
    row: Math.max(0, Math.floor(y / BATTLE_CELL_PX)),
  }
}

/** Light every cell on the integer line between two cells, so fast movement leaves an unbroken track. */
export function lightTrail(
  field: TrailField,
  cols: number,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): void {
  let x = fromCol
  let y = fromRow
  const dx = Math.abs(toCol - x)
  const dy = -Math.abs(toRow - y)
  const sx = x < toCol ? 1 : -1
  const sy = y < toRow ? 1 : -1
  let err = dx + dy
  for (;;) {
    field.set(trailKey(x, y, cols), GRID_TRAIL_STEPS)
    if (x === toCol && y === toRow) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

/** Advance the whole field one dim step, deleting cells that reach zero. */
export function ageTrail(field: TrailField): void {
  for (const [key, steps] of field) {
    if (steps <= 1) field.delete(key)
    else field.set(key, steps - 1)
  }
}

export function trailAlpha(steps: number): number {
  return (GRID_TRAIL_MAX_ALPHA * steps) / GRID_TRAIL_STEPS
}
