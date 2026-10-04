import { z } from 'zod'

import type { ChatModelCallDiagnostic } from '../observability/chat-diagnostics'
import type { EmbeddingPort } from './types'

const EMBEDDING_DIMENSIONS = 1024
const MAX_TEXT_LENGTH = 12_000
const MAX_BATCH_TEXTS = 256
const MAX_EMBEDDING_BATCH_SIZE = 4
const QUERY_INSTRUCTION = 'Instruct: Given a question, retrieve relevant passages that answer the question\nQuery: '
type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type EmbeddingKind = 'query' | 'document'
type ModelCallReporter = (call: ChatModelCallDiagnostic) => void

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

  const embedBatch = async (
    texts: string[],
    kind: EmbeddingKind,
    onModelCall: ModelCallReporter | undefined,
  ): Promise<number[][]> => {
    const operation = kind === 'query' ? 'query_embedding' : 'document_embedding'
    const payload = kind === 'query' ? texts.map((text) => `${QUERY_INSTRUCTION}${text}`) : texts

    let response: Response
    try {
      response = await fetcher(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        // A single text keeps the bare-string body every existing provider call
        // uses; a batch uses the OpenAI array form.
        body: JSON.stringify({
          input: payload.length === 1 ? payload[0] : payload,
          model: config.model,
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      })
    } catch {
      onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
      throw new Error('Embedding provider request failed')
    }
    if (!response.ok) {
      onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
      throw new Error('Embedding provider request failed')
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
      throw new Error('Embedding provider returned an invalid response')
    }

    const result = embeddingResponseSchema.safeParse(parsed)
    const data = result.success ? result.data : undefined
    const items = data?.data ?? []
    const ordered = new Array<number[] | undefined>(payload.length)
    const valid =
      items.length === payload.length &&
      items.every((item) => {
        if (item.embedding.length !== EMBEDDING_DIMENSIONS || item.index < 0 || item.index >= payload.length) {
          return false
        }
        if (ordered[item.index] !== undefined) return false
        ordered[item.index] = item.embedding
        return true
      })
    if (!valid || ordered.some((item) => item === undefined)) {
      onModelCall?.({ provider: 'siliconflow', operation, model: config.model, status: 'failed' })
      throw new Error('Embedding provider returned an invalid response')
    }
    onModelCall?.({
      provider: 'siliconflow',
      operation,
      model: data?.model ?? config.model,
      status: 'succeeded',
      ...(data?.usage?.prompt_tokens !== undefined ? { inputTokens: data.usage.prompt_tokens } : {}),
      ...(data?.usage?.completion_tokens !== undefined ? { outputTokens: data.usage.completion_tokens } : {}),
      ...(data?.usage?.total_tokens !== undefined ? { totalTokens: data.usage.total_tokens } : {}),
    })
    return ordered as number[][]
  }

  return {
    async embedMany(input) {
      const texts = input.texts.map((text) => text.trim())
      const invalid =
        texts.length === 0 ||
        texts.length > MAX_BATCH_TEXTS ||
        texts.some((text) => !text || text.length > MAX_TEXT_LENGTH)
      if (invalid) {
        input.onModelCall?.({
          provider: 'siliconflow',
          operation: input.kind === 'query' ? 'query_embedding' : 'document_embedding',
          model: config.model,
          status: 'failed',
        })
        throw new Error('Embedding input is invalid')
      }

      const vectors: number[][] = []
      for (let offset = 0; offset < texts.length; offset += MAX_EMBEDDING_BATCH_SIZE) {
        const batch = texts.slice(offset, offset + MAX_EMBEDDING_BATCH_SIZE)
        vectors.push(...(await embedBatch(batch, input.kind, input.onModelCall)))
      }
      return vectors
    },
    async embed(input) {
      const [vector] = await this.embedMany({
        texts: [input.text],
        kind: input.kind,
        ...(input.onModelCall ? { onModelCall: input.onModelCall } : {}),
      })
      return vector
    },
  }
}
