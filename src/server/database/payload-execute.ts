import type { SQL } from 'drizzle-orm'
import { getPayload } from 'payload'

// Raw SQL runner over Payload's own Postgres pool. Stores take one of these so tests can pass a fake.
export type SqlExecute = (query: SQL) => Promise<{ rows?: Array<Record<string, unknown>> }>

// Payload's config is imported on first use, not at module load, so importing a store does not boot the CMS.
async function loadDrizzle() {
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  return payload.db.drizzle
}

let drizzlePromise: ReturnType<typeof loadDrizzle> | undefined

export const executePayloadSql: SqlExecute = async (query) => {
  drizzlePromise ??= loadDrizzle()
  const drizzle = await drizzlePromise
  return (await drizzle.execute(query)) as { rows?: Array<Record<string, unknown>> }
}
