import { Pool } from 'pg'

import { getServerEnv } from '../src/server/env'
import { requireIntegrationEnv } from '../src/server/env-schema'
import { migrateKnowledgeDatabase } from '../src/server/knowledge/database-migration'

const env = getServerEnv()
const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5_000 })

try {
  await migrateKnowledgeDatabase(pool)
  console.info(JSON.stringify({ event: 'knowledge.database.migration.completed', version: 1 }))
} finally {
  await pool.end()
}
