import { describe, expect, it } from 'bun:test'

import { createBunSqlClient, createQueryPort, type QueryPort } from '../../src/server/database/bun-sql'
import { migrateKnowledgeDatabase } from '../../src/server/knowledge/database-migration'
import { createCodingHistoryRepository } from '../../src/server/wakatime/history/repository'

const testDatabaseUrl = Bun.env.KNOWLEDGE_TEST_DATABASE_URL

async function insertHeartbeat(
  pool: QueryPort,
  row: {
    id: string
    day: string
    time: string
    project: string | null
    language: string | null
    duration: number
  },
) {
  await pool.query(
    `INSERT INTO "wakatime_heartbeats"
     ("waka_id", "day", "time", "project", "language", "entity_hash", "duration_seconds")
     VALUES ($1, $2, $3, $4, $5, 'hash', $6)`,
    [row.id, row.day, row.time, row.project, row.language, row.duration],
  )
}

describe.skipIf(!testDatabaseUrl)('CodingHistoryRepository with Postgres', () => {
  async function setup() {
    const schema = `wakatime_test_${Bun.randomUUIDv7().replaceAll('-', '')}`
    // The migration runs with `public` on the path so extension types resolve,
    // then the rollup tables are dropped and the repository gets a client whose
    // search path is the test schema alone. Otherwise `to_regclass` would find
    // the rollup tables in the test schema or in `public` and the repository
    // would take the rollup path, leaving the heartbeat fallback untested.
    const migrationClient = createBunSqlClient({
      url: testDatabaseUrl!,
      applicationName: 'last-lst97-wakatime-test-migrate',
      connection: { search_path: `${schema},public` },
    })
    await migrationClient.unsafe(`CREATE SCHEMA "${schema}"`)
    const migrationConnection = await migrationClient.reserve()
    try {
      await migrateKnowledgeDatabase(createQueryPort(migrationConnection))
    } finally {
      migrationConnection.release()
    }
    await migrationClient.unsafe(
      `DROP TABLE "${schema}"."wakatime_daily_summary", "${schema}"."wakatime_daily_projects", "${schema}"."wakatime_daily_languages"`,
    )
    const client = createBunSqlClient({
      url: testDatabaseUrl!,
      applicationName: 'last-lst97-wakatime-test',
      connection: { search_path: schema },
    })
    const pool = createQueryPort(client)
    const ids = [
      '018d821d-7e0a-4e9b-a2ad-3780dc095501',
      '018d821d-7e0a-4e9b-a2ad-3780dc095502',
      '018d821d-7e0a-4e9b-a2ad-3780dc095503',
      '018d821d-7e0a-4e9b-a2ad-3780dc095504',
    ]
    await insertHeartbeat(pool, {
      id: ids[0]!,
      day: '2025-01-01',
      time: '2025-01-01T10:00:00Z',
      project: 'alpha',
      language: 'TypeScript',
      duration: 600,
    })
    await insertHeartbeat(pool, {
      id: ids[1]!,
      day: '2025-01-01',
      time: '2025-01-01T11:00:00Z',
      project: 'alpha',
      language: 'TypeScript',
      duration: 300,
    })
    await insertHeartbeat(pool, {
      id: ids[2]!,
      day: '2025-01-02',
      time: '2025-01-02T10:00:00Z',
      project: 'beta',
      language: 'Python',
      duration: 1200,
    })
    await insertHeartbeat(pool, {
      id: ids[3]!,
      day: '2025-01-04',
      time: '2025-01-04T10:00:00Z',
      project: null,
      language: null,
      duration: 60,
    })
    return { client, migrationClient, pool, repository: createCodingHistoryRepository(pool), schema }
  }

  it('aggregates totals, tops, series, and streaks from heartbeat rows', async () => {
    const { client, migrationClient, repository, schema } = await setup()
    try {
      await expect(repository.summary({ from: '2025-01-01', to: '2025-01-31' })).resolves.toEqual({
        totalSeconds: 2160,
        activeDays: 3,
        heartbeatCount: 4,
      })
      const projects = await repository.byProject({ from: '2025-01-01', to: '2025-01-31' }, 10)
      expect(projects.map((entry) => entry.name)).toEqual(['beta', 'alpha', '(unknown)'])
      expect(projects[0]).toMatchObject({ seconds: 1200, heartbeats: 1 })
      const series = await repository.dailySeries({ from: '2025-01-01', to: '2025-01-31' })
      expect(series).toEqual([
        { date: '2025-01-01', seconds: 900 },
        { date: '2025-01-02', seconds: 1200 },
        { date: '2025-01-04', seconds: 60 },
      ])
      await expect(repository.streaks('2025-01-04')).resolves.toEqual({ longestDays: 2, currentDays: 1 })
      await expect(repository.streaks('2025-02-10')).resolves.toEqual({ longestDays: 2, currentDays: 0 })
      await expect(repository.coverage?.()).resolves.toEqual({ through: '2025-01-04' })
    } finally {
      await migrationClient.unsafe(`DROP SCHEMA "${schema}" CASCADE`).catch(() => {})
      await client.close()
      await migrationClient.close()
    }
  })

  it('rejects invalid ranges before touching the database', async () => {
    const { client, migrationClient, repository, schema } = await setup()
    try {
      await expect(repository.summary({ from: '2025-02-01', to: '2025-01-01' })).rejects.toThrow('from <= to')
      await expect(repository.summary({ from: 'not-a-date', to: '2025-01-01' })).rejects.toThrow('YYYY-MM-DD')
    } finally {
      await migrationClient.unsafe(`DROP SCHEMA "${schema}" CASCADE`).catch(() => {})
      await client.close()
      await migrationClient.close()
    }
  })
})
