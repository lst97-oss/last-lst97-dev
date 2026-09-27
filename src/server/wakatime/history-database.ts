import { Pool } from 'pg'

import { getServerEnv } from '../env'
import { requireIntegrationEnv } from '../env-schema'
import { createCodingHistoryRepository, type CodingHistoryRepository } from './history-repository'

let pool: Pool | undefined
let repository: CodingHistoryRepository | undefined

export function getCodingHistoryRepository(): CodingHistoryRepository {
  if (repository) return repository

  const env = getServerEnv()
  const connectionString = requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'last-lst97-wakatime',
  })
  repository = createCodingHistoryRepository(pool)
  return repository
}

export async function closeCodingHistoryDatabase(): Promise<void> {
  const currentPool = pool
  pool = undefined
  repository = undefined
  if (currentPool) await currentPool.end()
}
