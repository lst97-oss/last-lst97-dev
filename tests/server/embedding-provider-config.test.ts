import { describe, expect, it } from 'bun:test'
import { createServerEnv } from '../../src/server/env-schema'
import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import {
  createIndexEmbeddingConfig,
  createQueryEmbeddingConfig,
} from '../../src/server/knowledge/embedding-provider-config'

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('embedding provider config', () => {
  it('uses the cloud query endpoint and SiliconFlow key while retaining the shared model', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const env = createServerEnv({
      DATABASE_URL: 'postgres://portfolio:secret@localhost:5432/portfolio',
      PAYLOAD_SECRET: 'a-long-enough-payload-secret-value',
      KNOWLEDGE_QUERY_EMBEDDING_URL: 'https://api.siliconflow.com/v1',
      KNOWLEDGE_EMBEDDING_URL: 'http://127.0.0.1:8787/v1',
      KNOWLEDGE_EMBEDDING_API_KEY: 'local-sidecar-key',
      KNOWLEDGE_EMBEDDING_MODEL: 'Qwen/Qwen3-Embedding-0.6B',
    })
    const config = createQueryEmbeddingConfig(env, 'siliconflow-query-key')
    const client = createEmbeddingClient(config, async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return response({ data: [{ index: 0, embedding: Array(1024).fill(0.25) }] })
    })

    await client.embed({ text: 'Find my projects', kind: 'query' })

    expect(requestUrl).toBe('https://api.siliconflow.com/v1/embeddings')
    expect(requestInit?.headers).toMatchObject({ authorization: 'Bearer siliconflow-query-key' })
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      input: 'Instruct: Given a question, retrieve relevant passages that answer the question\nQuery: Find my projects',
      model: 'Qwen/Qwen3-Embedding-0.6B',
    })
  })

  it('uses the local sidecar endpoint and local key for document embeddings', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const env = createServerEnv({
      DATABASE_URL: 'postgres://portfolio:secret@localhost:5432/portfolio',
      PAYLOAD_SECRET: 'a-long-enough-payload-secret-value',
      KNOWLEDGE_QUERY_EMBEDDING_URL: 'https://api.siliconflow.com/v1',
      KNOWLEDGE_EMBEDDING_URL: 'http://127.0.0.1:8787/v1',
      KNOWLEDGE_EMBEDDING_API_KEY: 'local-sidecar-key',
      KNOWLEDGE_EMBEDDING_MODEL: 'Qwen/Qwen3-Embedding-0.6B',
    })
    const client = createEmbeddingClient(createIndexEmbeddingConfig(env), async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return response({ data: [{ index: 0, embedding: Array(1024).fill(0.5) }] })
    })

    await client.embed({ text: 'Portfolio project source', kind: 'document' })

    expect(requestUrl).toBe('http://127.0.0.1:8787/v1/embeddings')
    expect(requestInit?.headers).toMatchObject({ authorization: 'Bearer local-sidecar-key' })
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      input: 'Portfolio project source',
      model: 'Qwen/Qwen3-Embedding-0.6B',
    })
  })
})
