import { createBunSqlClient, createQueryPort } from '../../src/server/database/bun-sql'
import { decodePostgresCa } from '../../src/server/database/postgres-ca'
import { getServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { migrateKnowledgeDatabase } from '../../src/server/knowledge/database-migration'

const env = getServerEnv()
const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
const client = createBunSqlClient({
  url: connectionString,
  applicationName: 'last-lst97-knowledge-migrate',
  max: 1,
  connectionTimeoutSeconds: 5,
  caPem: decodePostgresCa(env.POSTGRES_SSL_CA),
})

try {
  // The migration sends BEGIN/COMMIT itself, so it needs one pinned connection.
  // A pooled Bun SQL client closes a connection returned inside a transaction.
  const reserved = await client.reserve()
  try {
    await migrateKnowledgeDatabase(createQueryPort(reserved))
  } finally {
    reserved.release()
  }
  console.info(JSON.stringify({ event: 'knowledge.database.migration.completed', version: 1 }))
} finally {
  await client.close()
}
