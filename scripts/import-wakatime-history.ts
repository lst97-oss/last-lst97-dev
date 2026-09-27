import { Pool } from 'pg'

import { getServerEnv } from '../src/server/env'
import { requireIntegrationEnv } from '../src/server/env-schema'
import { migrateKnowledgeDatabase } from '../src/server/knowledge/database-migration'
import { parseDumpDay, prepareHeartbeatRows, type PreparedHeartbeatRow } from '../src/server/wakatime/history-import'

function fail(message: string): never {
  console.error(JSON.stringify({ event: 'wakatime.history.import.failed', reason: message }))
  process.exit(1)
}

const INSERT_BATCH_SIZE = 5_000
const ROLLUP_REFRESH_DAYS = 60

function toPgTextArrayLiteral(values: string[]): string {
  return `{${values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`
}

async function insertBatch(pool: Pool, rows: PreparedHeartbeatRow[]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE)
    await pool.query(
      `WITH "input" AS (
         SELECT * FROM UNNEST(
           $1::uuid[], $2::date[], $3::timestamptz[], $4::text[], $5::text[], $6::text[],
           $7::text[], $8::text[], $9::boolean[], $10::float8[], $11::text[], $12::text[], $13::boolean[]
         ) AS "v"("waka_id", "day", "time", "project", "language", "category", "type", "branch", "is_write", "duration_seconds", "entity_hash", "dependencies", "ai_coding")
       )
       INSERT INTO "wakatime_heartbeats"
        ("waka_id", "day", "time", "project", "language", "category", "type", "branch", "is_write", "duration_seconds", "entity_hash", "dependencies", "ai_coding")
        SELECT "waka_id", "day", "time",
          NULLIF("project", ''), NULLIF("language", ''), NULLIF("category", ''), NULLIF("type", ''), NULLIF("branch", ''),
          "is_write", "duration_seconds", "entity_hash", "dependencies"::text[], "ai_coding"
        FROM "input" ON CONFLICT ("waka_id") DO NOTHING`,
      [
        batch.map((row) => row.wakaId),
        batch.map((row) => row.day),
        batch.map((row) => row.time),
        batch.map((row) => row.project ?? ''),
        batch.map((row) => row.language ?? ''),
        batch.map((row) => row.category ?? ''),
        batch.map((row) => row.type ?? ''),
        batch.map((row) => row.branch ?? ''),
        batch.map((row) => row.isWrite),
        batch.map((row) => row.durationSeconds),
        batch.map((row) => row.entityHash),
        batch.map((row) => toPgTextArrayLiteral(row.dependencies)),
        batch.map((row) => row.aiCoding),
      ],
    )
  }
}

async function refreshDayRollups(pool: Pool, days: string[]): Promise<void> {
  const unique = [...new Set(days)].sort()
  if (unique.length === 0) return
  for (let offset = 0; offset < unique.length; offset += ROLLUP_REFRESH_DAYS) {
    const slice = unique.slice(offset, offset + ROLLUP_REFRESH_DAYS)
    await pool.query(
      `WITH "fresh" AS (
         SELECT
           "day",
           COALESCE(SUM("duration_seconds"), 0) AS "total_seconds",
           COUNT(*)::int AS "heartbeat_count"
         FROM "wakatime_heartbeats" WHERE "day" = ANY ($1::date[]) GROUP BY "day"
       )
       INSERT INTO "wakatime_daily_summary" ("day", "total_seconds", "heartbeat_count")
       SELECT "day", "total_seconds", "heartbeat_count" FROM "fresh"
       ON CONFLICT ("day") DO UPDATE SET
         "total_seconds" = EXCLUDED."total_seconds",
         "heartbeat_count" = EXCLUDED."heartbeat_count"`,
      [slice],
    )
    await pool.query(
      `WITH "fresh" AS (
         SELECT "day", COALESCE(NULLIF("project", ''), '(unknown)') AS "project",
           COALESCE(SUM("duration_seconds"), 0) AS "seconds", COUNT(*)::int AS "heartbeats"
         FROM "wakatime_heartbeats" WHERE "day" = ANY ($1::date[]) GROUP BY "day", 2
       )
       INSERT INTO "wakatime_daily_projects" ("day", "project", "seconds", "heartbeats")
       SELECT "day", "project", "seconds", "heartbeats" FROM "fresh"
       ON CONFLICT ("day", "project") DO UPDATE SET
         "seconds" = EXCLUDED."seconds",
         "heartbeats" = EXCLUDED."heartbeats"`,
      [slice],
    )
    await pool.query(
      `WITH "fresh" AS (
         SELECT "day", COALESCE(NULLIF("language", ''), '(unknown)') AS "language",
           COALESCE(SUM("duration_seconds"), 0) AS "seconds", COUNT(*)::int AS "heartbeats"
         FROM "wakatime_heartbeats" WHERE "day" = ANY ($1::date[]) GROUP BY "day", 2
       )
       INSERT INTO "wakatime_daily_languages" ("day", "language", "seconds", "heartbeats")
       SELECT "day", "language", "seconds", "heartbeats" FROM "fresh"
       ON CONFLICT ("day", "language") DO UPDATE SET
         "seconds" = EXCLUDED."seconds",
         "heartbeats" = EXCLUDED."heartbeats"`,
      [slice],
    )
  }
}

async function *streamDumpDays(path: string): AsyncGenerator<string> {
  const file = Bun.file(path)
  if (!(await file.exists())) fail('The WakaTime dump file does not exist')
  const reader = file.stream().getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let inDays = false
  let braceDepth = 0
  let current = ''
  let inString = false
  let escaped = false

  const feed = (text: string): string[] => {
    const days: string[] = []
    buffer += text
    if (!inDays) {
      const marker = buffer.indexOf('"days"')
      if (marker < 0) {
        buffer = buffer.slice(-16)
        return days
      }
      const bracket = buffer.indexOf('[', marker)
      if (bracket < 0) return days
      buffer = buffer.slice(bracket + 1)
      inDays = true
    }
    let index = 0
    while (index < buffer.length) {
      const char = buffer[index] as string
      if (inString) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') inString = false
        if (braceDepth > 0) current += char
      } else if (char === '"') {
        inString = true
        if (braceDepth > 0) current += char
      } else if (char === '{') {
        braceDepth += 1
        current += char
      } else if (char === '}') {
        current += char
        braceDepth -= 1
        if (braceDepth === 0) {
          days.push(current)
          current = ''
        }
      } else if (braceDepth > 0) {
        current += char
      }
      index += 1
    }
    buffer = braceDepth > 0 ? '' : buffer.slice(index)
    return days
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (value) {
      for (const day of feed(decoder.decode(value, { stream: !done }))) {
        yield day
      }
    }
    if (done) break
  }
  const tail = decoder.decode()
  if (tail) {
    for (const day of feed(tail)) {
      yield day
    }
  }
}

const dumpPath = Bun.argv[2] ?? Bun.env.WAKATIME_DUMP_PATH
if (!dumpPath) fail('Provide the dump path as an argument or WAKATIME_DUMP_PATH')

const env = getServerEnv()
const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5_000 })

try {
  await migrateKnowledgeDatabase(pool)
  let importId = 0
  try {
    const ledger = await pool.query(
      `INSERT INTO "wakatime_imports" ("status") VALUES ('running') RETURNING "id"`,
    )
    importId = (ledger.rows[0] as { id: number }).id

    let days = 0
    let heartbeats = 0
    let rangeStart: string | null = null
    let rangeEnd: string | null = null
    let pending: PreparedHeartbeatRow[] = []
    let touchedDays: string[] = []
    async function flush(): Promise<void> {
      if (pending.length > 0) await insertBatch(pool, pending)
      if (touchedDays.length > 0) await refreshDayRollups(pool, touchedDays)
      pending = []
      touchedDays = []
    }
    for await (const rawDay of streamDumpDays(dumpPath)) {
      let day: { date: string; heartbeats: unknown[] } | null = null
      try {
        day = parseDumpDay(JSON.parse(rawDay))
      } catch {
        continue
      }
      if (!day) continue
      const rows = prepareHeartbeatRows(day.date, day.heartbeats)
      pending.push(...rows)
      touchedDays.push(day.date)
      days += 1
      heartbeats += rows.length
      rangeStart ??= day.date
      rangeEnd = day.date
      if (pending.length >= 20_000) await flush()
      if (days % 50 === 0) console.info(JSON.stringify({ event: 'wakatime.history.import.progress', days, heartbeats }))
    }
    await flush()
    await pool.query(`VACUUM (ANALYZE) "wakatime_heartbeats"`)
    await pool.query(`VACUUM (ANALYZE) "wakatime_daily_summary"`)
    await pool.query(`VACUUM (ANALYZE) "wakatime_daily_projects"`)
    await pool.query(`VACUUM (ANALYZE) "wakatime_daily_languages"`)

    await pool.query(
      `UPDATE "wakatime_imports" SET "completed_at" = now(), "days_count" = $2,
       "heartbeat_count" = $3, "range_start" = $4, "range_end" = $5, "status" = 'completed' WHERE "id" = $1`,
      [importId, days, heartbeats, rangeStart, rangeEnd],
    )
    console.info(JSON.stringify({ event: 'wakatime.history.import.completed', days, heartbeats, rangeStart, rangeEnd }))
  } catch (error) {
    if (importId > 0) await pool.query(`UPDATE "wakatime_imports" SET "completed_at" = now(), "status" = 'failed' WHERE "id" = $1`, [importId])
    throw error
  }
} finally {
  await pool.end()
}
