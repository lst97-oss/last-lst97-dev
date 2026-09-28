import { memo, useEffect, useRef } from 'react'

import {
  BATTLE_CELL_PX,
  BATTLE_LASER_TTL_SEC,
  BATTLE_TICK_MS,
  type BattleState,
  type BattleTeam,
  type BattleUnit,
  battleTick,
  createBattle,
  resizeBattle,
} from '@/components/site/battle/pixel-battle-sim'

const TEAM_FILL: Record<BattleTeam, string> = {
  blue: 'rgba(96, 150, 255, 0.35)',
  red: 'rgba(255, 110, 95, 0.35)',
  green: 'rgba(105, 215, 140, 0.35)',
}

const TEAM_LASER: Record<BattleTeam, string> = {
  blue: 'rgba(96, 150, 255, 0.6)',
  red: 'rgba(255, 110, 95, 0.6)',
  green: 'rgba(105, 215, 140, 0.6)',
}

const MELEE_PX = 20
const RANGED_PX = 24
const SPIN_SEC = 0.45
// Chunky shapes need no DPR scaling: DPR 1 quarters fill cost and backing memory.
const CANVAS_SCALE = 1
// Snap positions inside this epsilon so motion provably settles and the loop can sleep.
const SETTLE_EPS = 0.02
// Glide rate: eases a 1-cell step to rest in ~0.45s, inside one tick.
const GLIDE_RATE = 9

export interface UnitVisual {
  x: number
  y: number
  spinT: number
  seenSeq: number
}

interface LaserVisual {
  x1: number
  y1: number
  x2: number
  y2: number
  team: BattleTeam
  ttl: number
}

/** True when nothing is gliding, spinning, or fading, so the frame loop can sleep. */
export function battleVisualsSettled(
  seen: ReadonlyMap<number, UnitVisual>,
  units: readonly BattleUnit[],
  laserCount: number,
): boolean {
  if (laserCount > 0) return false
  for (const unit of units) {
    const visual = seen.get(unit.id)
    if (!visual) return false
    if (visual.spinT > 0) return false
    if (Math.abs(visual.x - unit.col) >= SETTLE_EPS) return false
    if (Math.abs(visual.y - unit.row) >= SETTLE_EPS) return false
  }
  return true
}

function cellCenter(col: number, row: number): { x: number; y: number } {
  return { x: (col + 0.5) * BATTLE_CELL_PX, y: (row + 0.5) * BATTLE_CELL_PX }
}

function paint(
  context: CanvasRenderingContext2D,
  battle: BattleState,
  seen: Map<number, UnitVisual>,
  lasers: LaserVisual[],
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height)

  for (const unit of battle.units) {
    const visual = seen.get(unit.id)
    if (!visual) continue
    const { x, y } = cellCenter(visual.x, visual.y)
    context.fillStyle = TEAM_FILL[unit.team]
    if (unit.kind === 'melee') {
      context.save()
      context.translate(x, y)
      if (visual.spinT > 0) context.rotate((1 - visual.spinT) * Math.PI * 2)
      context.fillRect(-MELEE_PX / 2, -MELEE_PX / 2, MELEE_PX, MELEE_PX)
      context.restore()
    } else {
      context.save()
      context.translate(x, y)
      context.rotate(unit.facing)
      context.beginPath()
      context.moveTo(RANGED_PX / 2, 0)
      context.lineTo(-RANGED_PX / 2, RANGED_PX / 2.4)
      context.lineTo(-RANGED_PX / 2, -RANGED_PX / 2.4)
      context.closePath()
      context.fill()
      context.restore()
    }
  }

  for (const laser of lasers) {
    context.strokeStyle = TEAM_LASER[laser.team]
    context.globalAlpha = Math.max(0, laser.ttl / BATTLE_LASER_TTL_SEC)
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(laser.x1, laser.y1)
    context.lineTo(laser.x2, laser.y2)
    context.stroke()
    context.globalAlpha = 1
  }
}

export const PixelBattleBackground = memo(function PixelBattleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let battle: BattleState | null = null
    const seen = new Map<number, UnitVisual>()
    const lasers: LaserVisual[] = []
    let frame = 0
    let running = false
    let last = 0
    let timer = 0

    const layout = () => {
      const cols = Math.max(1, Math.floor(window.innerWidth / BATTLE_CELL_PX))
      const rows = Math.max(1, Math.floor(window.innerHeight / BATTLE_CELL_PX))
      canvas.width = Math.max(1, Math.floor(window.innerWidth * CANVAS_SCALE))
      canvas.height = Math.max(1, Math.floor(window.innerHeight * CANVAS_SCALE))
      context.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
      if (!battle) {
        battle = createBattle(cols, rows)
      } else {
        resizeBattle(battle, cols, rows)
      }
      pruneVisuals()
    }

    const pruneVisuals = () => {
      if (!battle) return
      const alive = new Set(battle.units.map((unit) => unit.id))
      for (const id of [...seen.keys()]) {
        if (!alive.has(id)) seen.delete(id)
      }
    }

    const syncVisuals = (dtSec: number | null) => {
      if (!battle) return
      for (const unit of battle.units) {
        let visual = seen.get(unit.id)
        if (!visual) {
          visual = { x: unit.col, y: unit.row, spinT: 0, seenSeq: unit.attackSeq }
          seen.set(unit.id, visual)
        }
        if (unit.attackSeq !== visual.seenSeq) {
          visual.seenSeq = unit.attackSeq
          if (unit.kind === 'melee') visual.spinT = 1
        }
        if (dtSec === null) {
          visual.x = unit.col
          visual.y = unit.row
          visual.spinT = 0
        } else {
          const ease = 1 - Math.exp(-GLIDE_RATE * dtSec)
          const dx = unit.col - visual.x
          const dy = unit.row - visual.y
          visual.x = Math.abs(dx) < SETTLE_EPS ? unit.col : visual.x + dx * ease
          visual.y = Math.abs(dy) < SETTLE_EPS ? unit.row : visual.y + dy * ease
          visual.spinT = Math.max(0, visual.spinT - dtSec / SPIN_SEC)
        }
      }
    }

    const paintStill = () => {
      if (!battle) return
      syncVisuals(null)
      paint(context, battle, seen, [], window.innerWidth, window.innerHeight)
    }

    const stopLoop = () => {
      running = false
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
    }

    const startLoop = () => {
      if (running) return
      running = true
      last = performance.now()
      frame = window.requestAnimationFrame(onFrame)
    }

    const scheduleTick = (delayMs: number) => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(runTick, delayMs)
    }

    const runTick = () => {
      timer = 0
      if (document.hidden) {
        scheduleTick(BATTLE_TICK_MS)
        return
      }
      if (!battle) return
      for (const event of battleTick(battle)) {
        const from = cellCenter(event.fromCol, event.fromRow)
        const to = cellCenter(event.toCol, event.toRow)
        lasers.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, team: event.team, ttl: BATTLE_LASER_TTL_SEC })
      }
      pruneVisuals()
      startLoop()
      scheduleTick(BATTLE_TICK_MS)
    }

    const onFrame = (now: number) => {
      if (!battle) {
        stopLoop()
        return
      }
      const dtSec = Math.min((now - last) / 1000, 0.1)
      last = now
      syncVisuals(dtSec)
      for (let i = lasers.length - 1; i >= 0; i -= 1) {
        lasers[i].ttl -= dtSec
        if (lasers[i].ttl <= 0) lasers.splice(i, 1)
      }
      paint(context, battle, seen, lasers, window.innerWidth, window.innerHeight)
      if (battleVisualsSettled(seen, battle.units, lasers.length)) {
        stopLoop()
      } else {
        frame = window.requestAnimationFrame(onFrame)
      }
    }

    const onResize = () => {
      layout()
      if (!running) paintStill()
    }

    const onVisibility = () => {
      if (document.hidden) {
        stopLoop()
        if (timer) window.clearTimeout(timer)
        timer = 0
      } else {
        layout()
        scheduleTick(250)
      }
    }

    layout()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paintStill()
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    paintStill()
    scheduleTick(BATTLE_TICK_MS)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopLoop()
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas aria-hidden="true" className="pixel-field" ref={canvasRef} />
})
