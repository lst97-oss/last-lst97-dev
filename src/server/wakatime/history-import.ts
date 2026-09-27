import { createHash } from 'node:crypto'
import { z } from 'zod'

// Pure helpers for the WakaTime heartbeat-dump import. Raw file paths are
// hashed at the boundary: only `entity_hash` reaches the database, never the
// absolute path. Durations follow WakaTime's join rule — the gap to the next
// heartbeat capped at the 15-minute keystroke timeout, trailing heartbeat 0.

export const HEARTBEAT_TIMEOUT_SECONDS = 900
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const rawHeartbeatSchema = z.object({
  id: z.string(),
  time: z.number().finite(),
  project: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  entity: z.string().optional().nullable(),
  is_write: z.boolean().optional().nullable(),
  dependencies: z.array(z.unknown()).optional().nullable(),
}).passthrough()

const dumpDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heartbeats: z.array(z.unknown()),
}).passthrough()

export interface PreparedHeartbeatRow {
  wakaId: string
  day: string
  time: string
  project: string | null
  language: string | null
  category: string | null
  type: string | null
  branch: string | null
  isWrite: boolean
  durationSeconds: number
  entityHash: string
  dependencies: string[]
  aiCoding: boolean
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function computeDurations(sortedTimes: number[]): number[] {
  return sortedTimes.map((time, index) => {
    const next = sortedTimes[index + 1]
    if (next === undefined || next <= time) return 0
    return Math.min(next - time, HEARTBEAT_TIMEOUT_SECONDS)
  })
}

const entityHashCache = new Map<string, string>()
const EMPTY_ENTITY_HASH = sha256Hex('')

function entityHashFor(entity: string | null | undefined): string {
  if (!entity) return EMPTY_ENTITY_HASH
  const cached = entityHashCache.get(entity)
  if (cached !== undefined) return cached
  const digest = sha256Hex(entity)
  if (entityHashCache.size < 50_000) entityHashCache.set(entity, digest)
  return digest
}

function cleanText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed ? trimmed : null
}

export function prepareHeartbeatRows(day: string, heartbeats: unknown[]): PreparedHeartbeatRow[] {
  const parsed = heartbeats
    .map((entry) => rawHeartbeatSchema.safeParse(entry))
    .flatMap((result) => (result.success && UUID_PATTERN.test(result.data.id) ? [result.data] : []))

  let ordered = true
  for (let index = 1; index < parsed.length; index += 1) {
    if (parsed[index]!.time < parsed[index - 1]!.time) {
      ordered = false
      break
    }
  }
  if (!ordered) parsed.sort((a, b) => a.time - b.time)

  const durations = computeDurations(parsed.map((entry) => entry.time))

  return parsed.map((entry, index) => {
    const dependencies = (entry.dependencies ?? [])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().slice(0, 200))
      .slice(0, 50)
    return {
      wakaId: entry.id,
      day,
      time: new Date(entry.time * 1000).toISOString(),
      project: cleanText(entry.project, 500),
      language: cleanText(entry.language, 120),
      category: cleanText(entry.category, 60),
      type: cleanText(entry.type, 20),
      branch: cleanText(entry.branch, 255),
      isWrite: entry.is_write === true,
      durationSeconds: durations[index] ?? 0,
      entityHash: entityHashFor(entry.entity),
      dependencies,
      aiCoding: entry.category === 'AI Coding',
    }
  })
}

export function parseDumpDay(value: unknown): { date: string; heartbeats: unknown[] } | null {
  const parsed = dumpDaySchema.safeParse(value)
  if (!parsed.success) return null
  return { date: parsed.data.date, heartbeats: parsed.data.heartbeats }
}

export function formatHours(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0 mins'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes} mins`
  if (minutes === 0) return `${hours} hrs`
  return `${hours} hrs ${minutes} mins`
}
