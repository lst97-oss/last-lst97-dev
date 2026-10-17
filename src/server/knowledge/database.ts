import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { getServerEnv } from '../env'
import { requireIntegrationEnv } from '../env-schema'
import type { KnowledgeDatabase } from './repository'
import { createKnowledgeIndexRepository } from './repository'

let pool: Pool | undefined
let repository: ReturnType<typeof createKnowledgeIndexRepository> | undefined

export function getKnowledgeIndexRepository() {
  if (repository) return repository

  const env = getServerEnv()
  const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
  pool = new Pool({
    connectionString,
    // Two of six connections this serverless instance may hold; the budget and
    // its arithmetic live in payload.config.ts. Chat tool calls run
    // sequentially, so this is headroom, not contention.
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'last-lst97-knowledge',
  })
  repository = createKnowledgeIndexRepository(drizzle(pool) as unknown as KnowledgeDatabase)
  return repository
}

export async function closeKnowledgeDatabase(): Promise<void> {
  const currentPool = pool
  pool = undefined
  repository = undefined
  if (currentPool) await currentPool.end()
}
