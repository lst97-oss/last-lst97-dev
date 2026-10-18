import type { SQL } from 'bun'

import { createBunSqlClient, createQueryPort } from '../../database/bun-sql'
import { decodePostgresCa } from '../../database/postgres-ca'
import { getServerEnv } from '../../env'
import { requireIntegrationEnv } from '../../env-schema'
import { type CodingHistoryRepository, createCodingHistoryRepository } from './repository'

let client: SQL | undefined
let repository: CodingHistoryRepository | undefined

export function getCodingHistoryRepository(): CodingHistoryRepository {
  if (repository) return repository

  const env = getServerEnv()
  const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
  client = createBunSqlClient({
    url: connectionString,
    applicationName: 'last-lst97-wakatime',
    // Two of six connections this serverless instance may hold; the budget and
    // its arithmetic live in payload.config.ts.
    max: 2,
    idleTimeoutSeconds: 30,
    connectionTimeoutSeconds: 5,
    caPem: decodePostgresCa(env.POSTGRES_SSL_CA),
  })
  repository = createCodingHistoryRepository(createQueryPort(client))
  return repository
}

export async function closeCodingHistoryDatabase(): Promise<void> {
  const currentClient = client
  client = undefined
  repository = undefined
  if (currentClient) await currentClient.close()
}
