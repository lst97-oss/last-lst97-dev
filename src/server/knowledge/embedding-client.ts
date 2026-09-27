import { z } from 'zod'

import type { EmbeddingPort } from './types'

const EMBEDDING_DIMENSIONS = 1024
const MAX_TEXT_LENGTH = 12_000
const QUERY_INSTRUCTION = 'Instruct: Given a question, retrieve relevant passages that answer the question\nQuery: '
type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const embeddingResponseSchema = z.object({
  model: z.string().optional(),
  usage: z
    .object({
      prompt_tokens: z.number().finite().nonnegative().optional(),
      completion_tokens: z.number().finite().nonnegative().optional(),
      total_tokens: z.number().finite().nonnegative().optional(),
    })
    .optional(),
  data: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      embedding: z.array(z.number().finite()),
    }),
  ),
})

export interface EmbeddingClientConfig {
  baseUrl: string
  model: string
  apiKey?: string
  timeoutMs: number
}

export function createEmbeddingClient(config: EmbeddingClientConfig, fetcher: FetchFunction = fetch): EmbeddingPort {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  return {
    async embed(input) {
      const operation = input.kind === 'query' ? 'query_embedding' : 'document_embedding'
      const text = input.text.trim()
      if (!text || text.length > MAX_TEXT_LENGTH) {
        input.onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
        throw new Error('Embedding input is invalid')
      }

      let response: Response
      try {
        response = await fetcher(`${baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            input: input.kind === 'query' ? `${QUERY_INSTRUCTION}${text}` : text,
            model: config.model,
          }),
          signal: AbortSignal.timeout(config.timeoutMs),
        })
      } catch {
        input.onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
        throw new Error('Embedding provider request failed')
      }
      if (!response.ok) {
        input.onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
        throw new Error('Embedding provider request failed')
      }

      let parsed: unknown
      try {
        parsed = await response.json()
      } catch {
        input.onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
        throw new Error('Embedding provider returned an invalid response')
      }
      const result = embeddingResponseSchema.safeParse(parsed)
      const data = result.success ? result.data : undefined
      const item = data?.data[0]
      if (item?.index !== 0 || item.embedding.length !== EMBEDDING_DIMENSIONS) {
        input.onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
        throw new Error('Embedding provider returned an invalid response')
      }
      input.onModelCall?.({
        provider: 'siliconflow',
        operation,
        model: data?.model ?? config.model,
        status: 'succeeded',
        ...(data?.usage?.prompt_tokens !== undefined ? { inputTokens: data.usage.prompt_tokens } : {}),
        ...(data?.usage?.completion_tokens !== undefined ? { outputTokens: data.usage.completion_tokens } : {}),
        ...(data?.usage?.total_tokens !== undefined ? { totalTokens: data.usage.total_tokens } : {}),
      })
      return item.embedding
    },
  }
}
