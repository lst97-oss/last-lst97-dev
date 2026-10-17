import type { SQL } from 'bun'
import { drizzle } from 'drizzle-orm/bun-sql'

import { createBunSqlClient } from '../database/bun-sql'
import { getServerEnv } from '../env'
import { requireIntegrationEnv } from '../env-schema'
import { createKnowledgeIndexRepository } from './repository'
import { createKnowledgeDatabase } from './repository/database-adapter'

let client: SQL | undefined
let repository: ReturnType<typeof createKnowledgeIndexRepository> | undefined

export function getKnowledgeIndexRepository() {
  if (repository) return repository

  const env = getServerEnv()
  const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
  client = createBunSqlClient({
    url: connectionString,
    applicationName: 'last-lst97-knowledge',
    // Two of six connections this serverless instance may hold; the budget and
    // its arithmetic live in payload.config.ts. Chat tool calls run
    // sequentially, so this is headroom, not contention.
    max: 2,
    idleTimeoutSeconds: 30,
    connectionTimeoutSeconds: 5,
  })
  repository = createKnowledgeIndexRepository(createKnowledgeDatabase(drizzle(client)))
  return repository
}

export async function closeKnowledgeDatabase(): Promise<void> {
  const currentClient = client
  client = undefined
  repository = undefined
  if (currentClient) await currentClient.close()
}
