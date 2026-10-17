import { SQL } from 'bun'

/**
 * node-postgres accepts `sslmode=no-verify`, which forces TLS without
 * certificate verification. Bun SQL has the same mode under `sslmode=require`
 * and rejects `no-verify` while constructing the client.
 *
 * Rewriting the shared secrets keeps them usable by both drivers and keeps a
 * rollback to node-postgres working. `verify-ca` and `verify-full` are left
 * untouched.
 */
const UNSUPPORTED_SSL_MODE = /([?&])(sslmode|ssl|tls)=no-verify(?=&|#|$)/gi

export function toBunSqlUrl(url: string): string {
  return url.replace(UNSUPPORTED_SSL_MODE, '$1$2=require')
}

export interface BunSqlClientOptions {
  url: string
  applicationName: string
  max?: number
  idleTimeoutSeconds?: number
  connectionTimeoutSeconds?: number
  connection?: Record<string, string | boolean | number>
}

/**
 * Creates a lazily connected Bun SQL pool. Timeouts are named in seconds
 * because Bun's options are seconds, even though `client.options` reports
 * milliseconds.
 */
export function createBunSqlClient(options: BunSqlClientOptions): SQL {
  return new SQL({
    url: toBunSqlUrl(options.url),
    max: options.max ?? 2,
    idleTimeout: options.idleTimeoutSeconds ?? 30,
    connectionTimeout: options.connectionTimeoutSeconds ?? 5,
    connection: {
      application_name: options.applicationName,
      ...options.connection,
    },
  })
}

export interface QueryPort {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>
}

/**
 * Adapts Bun SQL's row-array result to the `{ rows }` port the repositories
 * already use. Without this, `result.rows ?? []` would silently return every
 * query as empty.
 */
export function createQueryPort(client: SQL): QueryPort {
  return {
    async query(text, params) {
      const rows = params === undefined ? await client.unsafe(text) : await client.unsafe(text, params)
      return { rows }
    },
  }
}
