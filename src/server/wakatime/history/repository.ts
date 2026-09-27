import { z } from 'zod'

// Read-only aggregate queries over the local WakaTime heartbeat warehouse
// (`wakatime_heartbeats`). The chat layer only receives distilled aggregates —
// raw entities and dependency lists never leave this module.

export const MAX_SERIES_DAYS = 1200
export const MAX_TOP_ENTRIES = 10

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

export interface HistoryRange {
  from: string
  to: string
}

export function assertHistoryRange(range: HistoryRange): void {
  const parsed = z.object({ from: dateSchema, to: dateSchema }).safeParse(range)
  if (!parsed.success || parsed.data.from > parsed.data.to) {
    throw new Error('Coding history range must be two YYYY-MM-DD dates with from <= to')
  }
}

export interface HistorySummary {
  totalSeconds: number
  activeDays: number
  heartbeatCount: number
}

export interface HistoryTopEntry {
  name: string
  seconds: number
  heartbeats: number
}

export interface HistoryDayPoint {
  date: string
  seconds: number
}

export interface HistoryStreaks {
  longestDays: number
  currentDays: number
}

export interface CodingHistoryRepository {
  summary(range: HistoryRange): Promise<HistorySummary>
  byProject(range: HistoryRange, limit: number): Promise<HistoryTopEntry[]>
  byLanguage(range: HistoryRange, limit: number): Promise<HistoryTopEntry[]>
  projectTime(range: HistoryRange, project: string): Promise<HistorySummary>
  dailySeries(range: HistoryRange): Promise<HistoryDayPoint[]>
  streaks(today?: string): Promise<HistoryStreaks>
  coverage?(): Promise<HistoryCoverage>
}

export interface HistoryCoverage {
  through: string | null
}

interface PgPool {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>
}

const summaryRowSchema = z
  .object({
    total_seconds: z.coerce.number(),
    active_days: z.coerce.number(),
    heartbeat_count: z.coerce.number(),
  })
  .transform((row) => ({
    totalSeconds: row.total_seconds,
    activeDays: row.active_days,
    heartbeatCount: row.heartbeat_count,
  }))

const topRowSchema = z.object({
  name: z.string(),
  seconds: z.coerce.number(),
  heartbeats: z.coerce.number(),
})

const dayRowSchema = z.object({
  date: z
    .union([z.string(), z.date()])
    .transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10))),
  seconds: z.coerce.number(),
})

const coverageRowSchema = z.object({ through: z.string().nullable() })

const activeDayRowSchema = z.object({
  day: z
    .union([z.string(), z.date()])
    .transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10))),
})

function boundLimit(limit: number): number {
  if (!Number.isFinite(limit)) return MAX_TOP_ENTRIES
  return Math.min(Math.max(Math.floor(limit), 1), MAX_TOP_ENTRIES)
}

interface RollupSupport {
  supported: boolean | null
}

async function rollupsAvailable(pool: PgPool, cache: RollupSupport): Promise<boolean> {
  if (cache.supported !== null) return cache.supported
  try {
    const result = await pool.query(
      `SELECT to_regclass('wakatime_daily_summary') AS summary, to_regclass('wakatime_daily_projects') AS projects, to_regclass('wakatime_daily_languages') AS languages`,
    )
    const [row] = result.rows as Array<{ summary: string | null; projects: string | null; languages: string | null }>
    cache.supported =
      row?.summary !== null &&
      row?.summary !== undefined &&
      row?.projects !== null &&
      row?.projects !== undefined &&
      row?.languages !== null &&
      row?.languages !== undefined
  } catch {
    cache.supported = false
  }
  return cache.supported
}

export function createCodingHistoryRepository(pool: PgPool): CodingHistoryRepository {
  const support: RollupSupport = { supported: null }
  async function rows<T>(statement: string, params: unknown[], schema: z.ZodType<T>): Promise<T[]> {
    let result: { rows: unknown[] }
    try {
      result = await pool.query(statement, params)
    } catch {
      throw new Error('Coding history is temporarily unavailable')
    }
    return result.rows.map((row) => {
      const parsed = schema.safeParse(row)
      if (!parsed.success) throw new Error('Coding history is temporarily unavailable')
      return parsed.data
    })
  }

  return {
    async summary(range) {
      assertHistoryRange(range)
      if (await rollupsAvailable(pool, support)) {
        const [row] = await rows(
          `SELECT COALESCE(SUM("total_seconds"), 0) AS "total_seconds",
                  COUNT(*) AS "active_days",
                  COALESCE(SUM("heartbeat_count"), 0) AS "heartbeat_count"
           FROM "wakatime_daily_summary" WHERE "day" >= $1 AND "day" <= $2`,
          [range.from, range.to],
          summaryRowSchema,
        )
        return row ?? { totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }
      }
      const [row] = await rows(
        `SELECT COALESCE(SUM("duration_seconds"), 0) AS "total_seconds",
                COUNT(DISTINCT "day") AS "active_days",
                COUNT(*) AS "heartbeat_count"
         FROM "wakatime_heartbeats" WHERE "day" >= $1 AND "day" <= $2`,
        [range.from, range.to],
        summaryRowSchema,
      )
      return row ?? { totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }
    },

    async byProject(range, limit) {
      assertHistoryRange(range)
      if (await rollupsAvailable(pool, support)) {
        return rows(
          `SELECT "project" AS "name", SUM("seconds") AS "seconds", SUM("heartbeats")::int AS "heartbeats"
           FROM "wakatime_daily_projects" WHERE "day" >= $1 AND "day" <= $2
           GROUP BY 1 ORDER BY 2 DESC LIMIT $3`,
          [range.from, range.to, boundLimit(limit)],
          topRowSchema,
        )
      }
      return rows(
        `SELECT COALESCE(NULLIF("project", ''), '(unknown)') AS "name",
                SUM("duration_seconds") AS "seconds", COUNT(*) AS "heartbeats"
         FROM "wakatime_heartbeats" WHERE "day" >= $1 AND "day" <= $2
         GROUP BY 1 ORDER BY 2 DESC LIMIT $3`,
        [range.from, range.to, boundLimit(limit)],
        topRowSchema,
      )
    },

    async byLanguage(range, limit) {
      assertHistoryRange(range)
      if (await rollupsAvailable(pool, support)) {
        return rows(
          `SELECT "language" AS "name", SUM("seconds") AS "seconds", SUM("heartbeats")::int AS "heartbeats"
           FROM "wakatime_daily_languages" WHERE "day" >= $1 AND "day" <= $2
           GROUP BY 1 ORDER BY 2 DESC LIMIT $3`,
          [range.from, range.to, boundLimit(limit)],
          topRowSchema,
        )
      }
      return rows(
        `SELECT COALESCE(NULLIF("language", ''), '(unknown)') AS "name",
                SUM("duration_seconds") AS "seconds", COUNT(*) AS "heartbeats"
         FROM "wakatime_heartbeats" WHERE "day" >= $1 AND "day" <= $2
         GROUP BY 1 ORDER BY 2 DESC LIMIT $3`,
        [range.from, range.to, boundLimit(limit)],
        topRowSchema,
      )
    },
    async projectTime(range, project) {
      assertHistoryRange(range)
      const name = project.trim().slice(0, 500)
      if (!name) throw new Error('Coding history project name is required')
      if (await rollupsAvailable(pool, support)) {
        const [row] = await rows(
          `SELECT COALESCE(SUM("seconds"), 0) AS "total_seconds",
                  COUNT(*) AS "active_days",
                  COALESCE(SUM("heartbeats"), 0) AS "heartbeat_count"
           FROM "wakatime_daily_projects" WHERE "day" >= $1 AND "day" <= $2 AND "project" = $3`,
          [range.from, range.to, name],
          summaryRowSchema,
        )
        return row ?? { totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }
      }
      const [row] = await rows(
        `SELECT COALESCE(SUM("duration_seconds"), 0) AS "total_seconds",
                COUNT(DISTINCT "day") AS "active_days",
                COUNT(*) AS "heartbeat_count"
         FROM "wakatime_heartbeats" WHERE "day" >= $1 AND "day" <= $2 AND "project" = $3`,
        [range.from, range.to, name],
        summaryRowSchema,
      )
      return row ?? { totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }
    },

    async dailySeries(range) {
      assertHistoryRange(range)
      if (await rollupsAvailable(pool, support)) {
        return rows(
          `SELECT to_char("day", 'YYYY-MM-DD') AS "date", "total_seconds" AS "seconds"
           FROM "wakatime_daily_summary" WHERE "day" >= $1 AND "day" <= $2
           ORDER BY 1 ASC LIMIT $3`,
          [range.from, range.to, MAX_SERIES_DAYS],
          dayRowSchema,
        )
      }
      return rows(
        `SELECT to_char("day", 'YYYY-MM-DD') AS "date", SUM("duration_seconds") AS "seconds"
         FROM "wakatime_heartbeats" WHERE "day" >= $1 AND "day" <= $2
         GROUP BY 1 ORDER BY 1 ASC LIMIT $3`,
        [range.from, range.to, MAX_SERIES_DAYS],
        dayRowSchema,
      )
    },

    async streaks(today: string = new Date().toISOString().slice(0, 10)) {
      const days = (await rollupsAvailable(pool, support))
        ? await rows(
            `SELECT to_char("day", 'YYYY-MM-DD') AS "day" FROM "wakatime_daily_summary" ORDER BY 1 ASC`,
            [],
            activeDayRowSchema,
          )
        : await rows(
            `SELECT DISTINCT to_char("day", 'YYYY-MM-DD') AS "day" FROM "wakatime_heartbeats" ORDER BY 1 ASC`,
            [],
            activeDayRowSchema,
          )
      let longest = 0
      let run = 0
      let previous: string | null = null
      for (const { day } of days) {
        run = previous !== null && dayIsNextDay(previous, day) ? run + 1 : 1
        longest = Math.max(longest, run)
        previous = day
      }
      const seen = new Set(days.map((entry) => entry.day))
      const latest = days.at(-1)?.day ?? null
      let current = 0
      if (latest !== null && (latest === today || latest === previousDay(today))) {
        let cursor: string | null = latest
        while (cursor !== null && seen.has(cursor)) {
          current += 1
          cursor = previousDay(cursor)
        }
      }
      return { longestDays: longest, currentDays: current }
    },

    async coverage() {
      if (await rollupsAvailable(pool, support)) {
        const [rollupRow] = await rows(
          `SELECT to_char(MAX("day"), 'YYYY-MM-DD') AS "through" FROM "wakatime_daily_summary"`,
          [],
          coverageRowSchema,
        )
        if (rollupRow?.through) return { through: rollupRow.through }
      }
      const [heartbeatRow] = await rows(
        `SELECT to_char(MAX("day"), 'YYYY-MM-DD') AS "through" FROM "wakatime_heartbeats"`,
        [],
        coverageRowSchema,
      )
      return { through: heartbeatRow?.through ?? null }
    },
  }
}

function dayIsNextDay(previous: string, day: string): boolean {
  return previousDay(day) === previous
}

export function previousDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  const rolled = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1))
  rolled.setUTCDate(rolled.getUTCDate() - 1)
  return rolled.toISOString().slice(0, 10)
}
