/** Pure pointer-trail field for the site background. No DOM access here. Each lit cell zooms in, holds, then
 *  zooms out. Its zoom pace follows the cursor's speed where it crossed the cell, and it erases at the moment
 *  the cursor crossed it, so the trail replays the stroke. The canvas renderer in pixel-battle-background.tsx
 *  paints it beneath the battle units. */

import { BATTLE_CELL_PX } from '@/components/site/battle/pixel-battle-sim'

// Zoom-in duration at the reference pace: a lit cell pops to full size over this span, ease-out.
export const GRID_TRAIL_GROW_MS = 110
// How long a cell holds at full size. Fixed, so the erase replays the cursor's own timing.
export const GRID_TRAIL_HOLD_MS = 650
// Zoom-out duration at the reference pace: the cell shrinks to nothing over this span, accelerating.
export const GRID_TRAIL_SHRINK_MS = 220
// Pointer speed (px per ms) that plays the zoom at its base timing. 1 px/ms crosses a cell in about 32ms.
export const GRID_TRAIL_REF_SPEED = 1
// Pace is clamped so a flick still reads as a zoom and a crawl still moves.
export const GRID_TRAIL_PACE_MIN = 0.5
export const GRID_TRAIL_PACE_MAX = 2.5
// Pointer events stop while the cursor rests, so a longer gap says nothing about the move that follows.
export const GRID_TRAIL_SEGMENT_MAX_MS = 50
// Wash opacity of a lit cell. Multiplies the --os-trail token's own 0.6 alpha, so on screen it is 0.18.
export const GRID_TRAIL_MAX_ALPHA = 0.3

export interface TrailCell {
  bornAt: number
  eraseAt: number
  growMs: number
  shrinkMs: number
}

/** Lit cells keyed by trailKey. */
export type TrailField = Map<number, TrailCell>

/** A cell the cursor was in at a given time. */
export interface TrailStamp {
  col: number
  row: number
  at: number
}

export function trailKey(col: number, row: number, cols: number): number {
  return row * cols + col
}

export function cellAt(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.max(0, Math.floor(x / BATTLE_CELL_PX)),
    row: Math.max(0, Math.floor(y / BATTLE_CELL_PX)),
  }
}

/** Zoom pace for a stroke: 1 at the reference speed, faster for a flick, slower for a crawl, clamped. */
export function trailPace(distancePx: number, elapsedMs: number): number {
  const speed = distancePx / Math.max(elapsedMs, 1)
  return Math.min(GRID_TRAIL_PACE_MAX, Math.max(GRID_TRAIL_PACE_MIN, speed / GRID_TRAIL_REF_SPEED))
}

/** Light one cell at `at`. A cell still growing or holding keeps its zoom-in; a shrinking one pops again. */
export function lightCell(field: TrailField, key: number, at: number, pace: number): void {
  const current = field.get(key)
  const live = current && at < current.eraseAt ? current : undefined
  field.set(key, {
    bornAt: live?.bornAt ?? at,
    eraseAt: at + GRID_TRAIL_HOLD_MS,
    growMs: live?.growMs ?? GRID_TRAIL_GROW_MS / pace,
    shrinkMs: GRID_TRAIL_SHRINK_MS / pace,
  })
}

/** Light the cells crossed going from one stamp to the next. Each cell is stamped with its share of the elapsed
 *  time, so the erase replays the stroke at the speed it was drawn. The origin was lit on entry and is left alone. */
export function lightTrail(field: TrailField, cols: number, from: TrailStamp, to: TrailStamp, pace: number): void {
  const steps = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row))
  let x = from.col
  let y = from.row
  const dx = Math.abs(to.col - x)
  const dy = -Math.abs(to.row - y)
  const sx = x < to.col ? 1 : -1
  const sy = y < to.row ? 1 : -1
  let err = dx + dy
  for (let step = 1; x !== to.col || y !== to.row; step += 1) {
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
    lightCell(field, trailKey(x, y, cols), from.at + ((to.at - from.at) * step) / steps, pace)
  }
}

/** Drop each cell once its own zoom-out has finished. */
export function pruneTrail(field: TrailField, now: number): void {
  for (const [key, cell] of field) {
    if (now >= cell.eraseAt + cell.shrinkMs) field.delete(key)
  }
}

/** Zoom scale at `now`: eases up over growMs, holds, then eases down to zero over shrinkMs. */
export function trailScale(cell: TrailCell, now: number): number {
  const grow = easeOutCubic(progress(now - cell.bornAt, cell.growMs))
  const shrink = progress(now - cell.eraseAt, cell.shrinkMs)
  return Math.min(grow, 1 - shrink * shrink)
}

function progress(elapsedMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / durationMs))
}

function easeOutCubic(t: number): number {
  const inverse = 1 - t
  return 1 - inverse * inverse * inverse
}
