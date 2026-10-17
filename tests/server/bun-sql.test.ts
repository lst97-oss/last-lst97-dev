import { describe, expect, it } from 'bun:test'
import type { SQL } from 'bun'

import { createBunSqlClient, createQueryPort, toBunSqlUrl } from '../../src/server/database/bun-sql'

describe('Bun SQL client factory', () => {
  it('translates node-postgres no-verify modes without touching verified modes', () => {
    expect(toBunSqlUrl('postgres://u:p@host:5432/db?sslmode=no-verify')).toBe(
      'postgres://u:p@host:5432/db?sslmode=require',
    )
    expect(toBunSqlUrl('postgres://u:p@host:5432/db?ssl=no-verify&application_name=api')).toBe(
      'postgres://u:p@host:5432/db?ssl=require&application_name=api',
    )
    expect(toBunSqlUrl('postgres://u:p@host:5432/db?tls=no-verify#fragment')).toBe(
      'postgres://u:p@host:5432/db?tls=require#fragment',
    )
    expect(toBunSqlUrl('postgres://u:p@host:5432/db?sslmode=verify-full')).toBe(
      'postgres://u:p@host:5432/db?sslmode=verify-full',
    )
  })

  it('maps second-based pool options to the expected limits', async () => {
    const client = createBunSqlClient({
      url: 'postgres://u:p@127.0.0.1:5432/db',
      applicationName: 'last-lst97-test',
      max: 2,
      idleTimeoutSeconds: 30,
      connectionTimeoutSeconds: 5,
    })

    try {
      expect(client.options.max).toBe(2)
      // Bun reports resolved timeouts in milliseconds.
      expect(client.options.idleTimeout).toBe(30_000)
      expect(client.options.connectionTimeout).toBe(5_000)
    } finally {
      await client.close({ timeout: 0 })
    }
  })

  it('constructs a client from a node-postgres no-verify URL', async () => {
    const client = createBunSqlClient({
      url: 'postgres://u:p@127.0.0.1:1/db?sslmode=no-verify',
      applicationName: 'last-lst97-test',
    })

    try {
      // Bun's require mode: TLS without certificate verification.
      expect('sslMode' in client.options ? client.options.sslMode : undefined).toBe(2)
    } finally {
      await client.close({ timeout: 0 })
    }
  })

  it('adapts Bun SQL row arrays to the rows port', async () => {
    const rows = [{ id: 1 }]
    const fake = {
      unsafe: async (_text: string, _params?: unknown[]) => rows,
    } as unknown as SQL
    const port = createQueryPort(fake)

    await expect(port.query('select 1')).resolves.toEqual({ rows })
    await expect(port.query('select $1', [1])).resolves.toEqual({ rows })
  })
})
