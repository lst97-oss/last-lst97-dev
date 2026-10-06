import { getServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { parseBlogDocument } from '../../src/server/knowledge/blog-document'
import { closeKnowledgeDatabase, getKnowledgeIndexRepository } from '../../src/server/knowledge/database'
import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import { isLocalEmbeddingUrl, resolveIndexEmbeddingConfig } from '../../src/server/knowledge/embedding-provider-config'
import { assertSafeGithubMarkdown } from '../../src/server/knowledge/github/content-safety'
import { createIndexKnowledgeSource } from '../../src/server/knowledge/index-source'
import type { KnowledgeDocument, KnowledgeSource } from '../../src/server/knowledge/source-types'
import { logger } from '../../src/server/observability/logger'
import { startEmbeddingSidecar, stopEmbeddingSidecar } from '../dev/embedding-process'
import { projectRoot } from '../project-root'

const env = getServerEnv()

requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)

const documents: KnowledgeDocument[] = []
const identities = new Set<string>()
// One folder per blog post, each holding the single article file. The parser
// derives the post from the folder, so the glob is intentionally two levels
// deep rather than a flat `src/data/blog/*.md`.
for await (const relativePath of new Bun.Glob('src/data/blog/*/*.md').scan(projectRoot)) {
  const path = `${projectRoot}/${relativePath}`
  const text = await Bun.file(path).text()
  // The corpus is hand-authored, but the same gate runs over it: it ships
  // inside the published Docker image and is served to the model as evidence,
  // so a stray credential or PEM block must fail the run, not reach it.
  assertSafeGithubMarkdown(text)
  const document = parseBlogDocument(relativePath, text)
  if (!document) throw new Error('A blog document has invalid indexing metadata.')
  const identity = `${document.source.type}:${document.source.sourceId}`
  if (identities.has(identity)) throw new Error('Blog document identities must be unique before indexing.')
  identities.add(identity)
  documents.push(document)
}

if (documents.length === 0) throw new Error('No blog Markdown files were found.')

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
  const source: KnowledgeSource = { type: 'blog', fetch: async () => null }
  let indexedChunkCount = 0
  for (const document of documents) {
    const result = await createIndexKnowledgeSource({ source, embedding, repository, logger }).executeDocument(document)
    indexedChunkCount += result.chunkCount
  }

  let removedCount = 0
  for (const storedId of await repository.listSourceIds('blog')) {
    if (identities.has(`blog:${storedId}`)) continue
    await repository.removeSource('blog', storedId)
    removedCount += 1
  }

  logger.info('knowledge.blog.index.completed', {
    documentCount: documents.length,
    indexedChunkCount,
    removedCount,
  })
} catch (error) {
  logger.error('knowledge.blog.index.failed', {
    failureCategory: error instanceof Error ? error.name : 'unknown',
  })
  process.exitCode = 1
} finally {
  if (sidecar) await stopEmbeddingSidecar(sidecar)
  await closeKnowledgeDatabase()
}
