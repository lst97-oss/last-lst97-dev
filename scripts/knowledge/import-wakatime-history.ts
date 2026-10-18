import type { SQL } from 'bun'

import { createBunSqlClient, createQueryPort } from '../../src/server/database/bun-sql'
import { decodePostgresCa } from '../../src/server/database/postgres-ca'
import { getServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { migrateKnowledgeDatabase } from '../../src/server/knowledge/database-migration'
import { type PreparedHeartbeatRow, parseDumpDay, prepareHeartbeatRows } from '../../src/server/wakatime/history/import'

function fail(message: string): never {
  console.error(JSON.stringify({ event: 'wakatime.history.import.failed', reason: message }))
  process.exit(1)
}

const INSERT_BATCH_SIZE = 5_000
const ROLLUP_REFRESH_DAYS = 60

function toPgTextArrayLiteral(values: string[]): string {
  return `{${values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`
}

async function insertBatch(client: SQL, rows: PreparedHeartbeatRow[]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE)
    await client.unsafe(
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
        // `sql.unsafe` does not serialize a plain JS array for a cast; the
        // explicit `array()` helper sends a PostgreSQL array literal.
        client.array(
          batch.map((row) => row.wakaId),
          'UUID',
        ),
        client.array(
          batch.map((row) => row.day),
          'DATE',
        ),
        client.array(
          batch.map((row) => row.time),
          'TIMESTAMPTZ',
        ),
        client.array(
          batch.map((row) => row.project ?? ''),
          'TEXT',
        ),
        client.array(
          batch.map((row) => row.language ?? ''),
          'TEXT',
        ),
        client.array(
          batch.map((row) => row.category ?? ''),
          'TEXT',
        ),
        client.array(
          batch.map((row) => row.type ?? ''),
          'TEXT',
        ),
        client.array(
          batch.map((row) => row.branch ?? ''),
          'TEXT',
        ),
        client.array(
          batch.map((row) => row.isWrite),
          'BOOLEAN',
        ),
        client.array(
          batch.map((row) => row.durationSeconds),
          'DOUBLE PRECISION',
        ),
        client.array(
          batch.map((row) => row.entityHash),
          'TEXT',
        ),
        client.array(
          batch.map((row) => toPgTextArrayLiteral(row.dependencies)),
          'TEXT',
        ),
        client.array(
          batch.map((row) => row.aiCoding),
          'BOOLEAN',
        ),
      ],
    )
  }
}

async function refreshDayRollups(client: SQL, days: string[]): Promise<void> {
  const unique = [...new Set(days)].sort()
  if (unique.length === 0) return
  for (let offset = 0; offset < unique.length; offset += ROLLUP_REFRESH_DAYS) {
    const slice = unique.slice(offset, offset + ROLLUP_REFRESH_DAYS)
    await client.unsafe(
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
      [client.array(slice, 'DATE')],
    )
    await client.unsafe(
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
      [client.array(slice, 'DATE')],
    )
    await client.unsafe(
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
      [client.array(slice, 'DATE')],
    )
  }
}

async function* streamDumpDays(path: string): AsyncGenerator<string> {
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
const client = createBunSqlClient({
  url: connectionString,
  applicationName: 'last-lst97-wakatime-import',
  max: 2,
  connectionTimeoutSeconds: 5,
  caPem: decodePostgresCa(env.POSTGRES_SSL_CA),
})

try {
  // The migration sends BEGIN/COMMIT itself, so it needs one pinned connection.
  // A pooled Bun SQL client closes a connection returned inside a transaction.
  const migrationConnection = await client.reserve()
  try {
    await migrateKnowledgeDatabase(createQueryPort(migrationConnection))
  } finally {
    migrationConnection.release()
  }
  let importId = 0
  try {
    const [ledger] = await client.unsafe<Array<{ id: number }>>(
      `INSERT INTO "wakatime_imports" ("status") VALUES ('running') RETURNING "id"`,
    )
    importId = ledger.id

    let days = 0
    let heartbeats = 0
    let rangeStart: string | null = null
    let rangeEnd: string | null = null
    let pending: PreparedHeartbeatRow[] = []
    let touchedDays: string[] = []
    async function flush(): Promise<void> {
      if (pending.length > 0) await insertBatch(client, pending)
      if (touchedDays.length > 0) await refreshDayRollups(client, touchedDays)
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
    await client.unsafe(`VACUUM (ANALYZE) "wakatime_heartbeats"`)
    await client.unsafe(`VACUUM (ANALYZE) "wakatime_daily_summary"`)
    await client.unsafe(`VACUUM (ANALYZE) "wakatime_daily_projects"`)
    await client.unsafe(`VACUUM (ANALYZE) "wakatime_daily_languages"`)

    await client.unsafe(
      `UPDATE "wakatime_imports" SET "completed_at" = now(), "days_count" = $2,
       "heartbeat_count" = $3, "range_start" = $4, "range_end" = $5, "status" = 'completed' WHERE "id" = $1`,
      [importId, days, heartbeats, rangeStart, rangeEnd],
    )
    console.info(JSON.stringify({ event: 'wakatime.history.import.completed', days, heartbeats, rangeStart, rangeEnd }))
  } catch (error) {
    if (importId > 0)
      await client.unsafe(`UPDATE "wakatime_imports" SET "completed_at" = now(), "status" = 'failed' WHERE "id" = $1`, [
        importId,
      ])
    throw error
  }
} finally {
  await client.close()
}
