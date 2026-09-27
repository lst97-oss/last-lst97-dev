import { createKnowledgeCatalogOperations } from './repository/catalog'
import { createKnowledgeChunkOperations } from './repository/chunks'
import type { KnowledgeDatabase, KnowledgeIndexRepository } from './repository/types'

export type {
  KnowledgeChunk,
  KnowledgeDatabase,
  KnowledgeIndexRepository,
  KnowledgeProjectRecord,
} from './repository/types'

export function createKnowledgeIndexRepository(database: KnowledgeDatabase): KnowledgeIndexRepository {
  return {
    ...createKnowledgeChunkOperations(database),
    ...createKnowledgeCatalogOperations(database),
  }
}
