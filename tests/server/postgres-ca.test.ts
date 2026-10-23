import { describe, expect, it } from 'bun:test'

import { checkPinnedPostgresIdentity, decodePostgresCa, withoutSslMode } from '../../src/server/database/postgres-ca'

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----'

describe('Postgres pinned CA', () => {
  it('accepts a raw PEM and its base64 encoding', () => {
    expect(decodePostgresCa(PEM)).toBe(`${PEM}\n`)
    expect(decodePostgresCa(Buffer.from(PEM).toString('base64'))).toBe(`${PEM}\n`)
    expect(decodePostgresCa(undefined)).toBeUndefined()
    expect(decodePostgresCa('   ')).toBeUndefined()
  })

  it('rejects a value that is not a certificate', () => {
    expect(() => decodePostgresCa('not-a-certificate')).toThrow(
      'POSTGRES_SSL_CA must be a PEM certificate or its base64 encoding',
    )
  })

  it('removes sslmode without changing the rest of the URL', () => {
    expect(withoutSslMode('postgres://u:p%40ss@host:5432/db')).toBe('postgres://u:p%40ss@host:5432/db')
    expect(withoutSslMode('postgres://u:p@host:5432/db?sslmode=no-verify')).toBe('postgres://u:p@host:5432/db')
    expect(withoutSslMode('postgres://u:p@host:5432/db?sslmode=require&x=1')).toBe('postgres://u:p@host:5432/db?x=1')
    expect(withoutSslMode('postgres://u:p@host:5432/db?x=1&sslmode=no-verify')).toBe('postgres://u:p@host:5432/db?x=1')
    expect(withoutSslMode('postgres://u:p@host:5432/db?x=1&sslmode=no-verify#fragment')).toBe(
      'postgres://u:p@host:5432/db?x=1#fragment',
    )
  })

  it('requires the pinned localhost SAN for node-postgres identity checks', () => {
    expect(
      checkPinnedPostgresIdentity('zephyr.proxy.rlwy.net', {
        subjectaltname: 'DNS:localhost, DNS:postgres-pgvector.railway.internal',
      }),
    ).toBeUndefined()
    expect(
      checkPinnedPostgresIdentity('zephyr.proxy.rlwy.net', { subjectaltname: 'DNS:other.example' }),
    ).toBeInstanceOf(Error)
    expect(checkPinnedPostgresIdentity('zephyr.proxy.rlwy.net', {})).toBeInstanceOf(Error)
  })
})
