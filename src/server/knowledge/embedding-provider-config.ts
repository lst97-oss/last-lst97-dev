import type { ServerEnv } from '../env'
import { requireIntegrationEnv } from '../env-schema'
import type { EmbeddingClientConfig } from './embedding-client'

type QueryEmbeddingEnvironment = Pick<
  ServerEnv,
  'KNOWLEDGE_QUERY_EMBEDDING_URL' | 'KNOWLEDGE_EMBEDDING_MODEL' | 'KNOWLEDGE_EMBEDDING_TIMEOUT_MS'
>
export type IndexEmbeddingEnvironment = Pick<
  ServerEnv,
  | 'KNOWLEDGE_EMBEDDING_URL'
  | 'KNOWLEDGE_EMBEDDING_API_KEY'
  | 'KNOWLEDGE_EMBEDDING_MODEL'
  | 'KNOWLEDGE_EMBEDDING_TIMEOUT_MS'
  | 'SILICONFLOW_API_KEY'
>

/**
 * A loopback `KNOWLEDGE_EMBEDDING_URL` is the local `llama-server` sidecar, which
 * needs no credential; anything else is a remote OpenAI-compatible service that
 * does. The URL is therefore the single switch between the two, rather than a
 * convention an operator has to remember to apply consistently.
 *
 * IPv6 literals keep their brackets in `URL.hostname`
 * (`new URL('http://[::1]:8787/v1').hostname === '[::1]'`), so a bare `::1` entry
 * would never match. An unparseable URL is not local: routing it to the cloud
 * branch surfaces a missing key instead of silently retrying a dead loopback.
 */
const LOCAL_EMBEDDING_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

export function createQueryEmbeddingConfig(env: QueryEmbeddingEnvironment, apiKey: string): EmbeddingClientConfig {
  return {
    baseUrl: env.KNOWLEDGE_QUERY_EMBEDDING_URL,
    model: env.KNOWLEDGE_EMBEDDING_MODEL,
    apiKey,
    timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
  }
}

export function isLocalEmbeddingUrl(url: string): boolean {
  try {
    return LOCAL_EMBEDDING_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

export function resolveIndexEmbeddingConfig(env: IndexEmbeddingEnvironment): EmbeddingClientConfig {
  const base = {
    baseUrl: env.KNOWLEDGE_EMBEDDING_URL,
    model: env.KNOWLEDGE_EMBEDDING_MODEL,
    timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
  }
  return {
    ...base,
    apiKey: isLocalEmbeddingUrl(env.KNOWLEDGE_EMBEDDING_URL)
      ? env.KNOWLEDGE_EMBEDDING_API_KEY
      : requireIntegrationEnv('SILICONFLOW_API_KEY', env.SILICONFLOW_API_KEY),
  }
}
