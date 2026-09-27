import type { createServerEnv } from '../env-schema'
import type { EmbeddingClientConfig } from './embedding-client'

type QueryEmbeddingEnvironment = Pick<
  ReturnType<typeof createServerEnv>,
  'KNOWLEDGE_QUERY_EMBEDDING_URL' | 'KNOWLEDGE_EMBEDDING_MODEL' | 'KNOWLEDGE_EMBEDDING_TIMEOUT_MS'
>
type IndexEmbeddingEnvironment = Pick<
  ReturnType<typeof createServerEnv>,
  'KNOWLEDGE_EMBEDDING_URL' | 'KNOWLEDGE_EMBEDDING_API_KEY' | 'KNOWLEDGE_EMBEDDING_MODEL' | 'KNOWLEDGE_EMBEDDING_TIMEOUT_MS'
>

export function createQueryEmbeddingConfig(
  env: QueryEmbeddingEnvironment,
  apiKey: string,
): EmbeddingClientConfig {
  return {
    baseUrl: env.KNOWLEDGE_QUERY_EMBEDDING_URL,
    model: env.KNOWLEDGE_EMBEDDING_MODEL,
    apiKey,
    timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
  }
}

export function createIndexEmbeddingConfig(env: IndexEmbeddingEnvironment): EmbeddingClientConfig {
  return {
    baseUrl: env.KNOWLEDGE_EMBEDDING_URL,
    model: env.KNOWLEDGE_EMBEDDING_MODEL,
    apiKey: env.KNOWLEDGE_EMBEDDING_API_KEY,
    timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
  }
}
