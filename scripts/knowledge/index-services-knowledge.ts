import { getServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { closeKnowledgeDatabase, getKnowledgeIndexRepository } from '../../src/server/knowledge/database'
import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import { isLocalEmbeddingUrl, resolveIndexEmbeddingConfig } from '../../src/server/knowledge/embedding-provider-config'
import { assertSafeGithubMarkdown } from '../../src/server/knowledge/github/content-safety'
import { createIndexKnowledgeSource } from '../../src/server/knowledge/index-source'
import { parseServicesDocument } from '../../src/server/knowledge/services-document'
import type { KnowledgeDocument, KnowledgeSource } from '../../src/server/knowledge/source-types'
import { logger } from '../../src/server/observability/logger'
import { startEmbeddingSidecar, stopEmbeddingSidecar } from '../dev/embedding-process'
import { projectRoot } from '../project-root'

const env = getServerEnv()

requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)

const documents: KnowledgeDocument[] = []
const identities = new Set<string>()
// One level of offering folder: `services/<packages|support>/<source-id>.md`.
// `parseServicesDocument` rejects anything else, so an unrecognised folder
// fails the run rather than being indexed under a guessed offering.
for await (const relativePath of new Bun.Glob('src/data/services/*/*.md').scan(projectRoot)) {
  const path = `${projectRoot}/${relativePath}`
  const text = await Bun.file(path).text()
  assertSafeGithubMarkdown(text)
  const document = parseServicesDocument(relativePath, text)
  if (!document) throw new Error('A services document has invalid indexing metadata.')
  const identity = `${document.source.type}:${document.source.sourceId}`
  if (identities.has(identity)) throw new Error('Services document identities must be unique before indexing.')
  identities.add(identity)
  documents.push(document)
}

if (documents.length === 0) throw new Error('No services Markdown files were found.')

let sidecar: Bun.Subprocess | undefined
try {
  if (isLocalEmbeddingUrl(env.KNOWLEDGE_EMBEDDING_URL)) {
    const health = await fetch(new URL('/health', env.KNOWLEDGE_EMBEDDING_URL), {
      signal: AbortSignal.timeout(1_000),
    }).catch(() => null)
    if (!health?.ok) sidecar = await startEmbeddingSidecar()
  }

  const repository = getKnowledgeIndexRepository()
  const embedding = createEmbeddingClient(resolveIndexEmbeddingConfig(env))
  const source: KnowledgeSource = { type: 'services', fetch: async () => null }
  let indexedChunkCount = 0
  for (const document of documents) {
    const result = await createIndexKnowledgeSource({ source, embedding, repository, logger }).executeDocument(document)
    indexedChunkCount += result.chunkCount
  }

  let removedCount = 0
  for (const storedId of await repository.listSourceIds('services')) {
    if (identities.has(`services:${storedId}`)) continue
    await repository.removeSource('services', storedId)
    removedCount += 1
  }

  logger.info('knowledge.services.index.completed', {
    documentCount: documents.length,
    indexedChunkCount,
    removedCount,
  })
} catch (error) {
  logger.error('knowledge.services.index.failed', {
    failureCategory: error instanceof Error ? error.name : 'unknown',
  })
  process.exitCode = 1
} finally {
  if (sidecar) await stopEmbeddingSidecar(sidecar)
  await closeKnowledgeDatabase()
}
