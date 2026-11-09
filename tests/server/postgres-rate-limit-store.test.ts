import { describe, expect, it } from 'bun:test'

import { PgDialect } from 'drizzle-orm/pg-core'

import type { SqlExecute } from '../../src/server/database/payload-execute'
import { createPostgresRateLimitStore } from '../../src/server/security/postgres-rate-limit-store'

describe('postgres rate limit store', () => {
  it('returns the count as a number even when Postgres sends it as a string', async () => {
    const store = createPostgresRateLimitStore(async () => ({ rows: [{ request_count: '3' }] }))
    await expect(store.consume('chat', 'client', 0)).resolves.toBe(3)
  })

  it('throws when Postgres returns no usable count', async () => {
    await expect(createPostgresRateLimitStore(async () => ({ rows: [] })).consume('chat', 'c', 0)).rejects.toThrow(
      'invalid count',
    )
    await expect(
      createPostgresRateLimitStore(async () => ({ rows: [{ request_count: 0 }] })).consume('chat', 'c', 0),
    ).rejects.toThrow('invalid count')
  })

  it('runs the 48-hour cleanup once, not on every request', async () => {
    const statements: string[] = []
    const execute: SqlExecute = async (query) => {
      statements.push(new PgDialect().sqlToQuery(query).sql)
      return { rows: [{ request_count: 1 }] }
    }
    const store = createPostgresRateLimitStore(execute)

    await store.consume('chat', 'client', 0)
    await store.consume('chat', 'client', 0)
    expect(statements.filter((text) => text.startsWith('DELETE FROM "public_rate_limits"'))).toHaveLength(1)
  })
})
