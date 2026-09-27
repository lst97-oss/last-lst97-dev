import { noul, TypeSafeClient } from '@typesafe-ai/sdk'

import type { KnowledgeRelevancePort, KnowledgeRelevanceScores } from './types'

const DEFAULT_TIMEOUT_MS = 5_000
const MAX_QUERY_LENGTH = 2_000
const MAX_DOCUMENT_ID_LENGTH = 200
const MAX_DOCUMENT_TITLE_LENGTH = 500
const MAX_DOCUMENT_TEXT_LENGTH = 6_000
const DECISION_ERROR = 'Jev knowledge relevance decision failed'

const RELEVANCE_QUESTIONS = {
  is_relevant: noul(
    'Does this document directly support a fact or answer requested by the current question?',
    {
      true: 'The document directly answers the current question or supplies a concrete fact that supports the requested answer. For a named project, a document identifying that exact repository is relevant even when its report says the purpose is unknown; use its supported metadata and limitations. The same broad topic, keyword, or source type alone is not enough.',
      false: 'The document only shares a broad topic or keyword, or unrelated repository metadata, and neither identifies the exact named project nor provides a fact relevant to the request.',
    },
  ),
  contains_answer_evidence: noul(
    'Does this document contain usable evidence for a direct answer to the current question?',
    {
      true: 'The document states a concrete relevant fact, description, comparison, or limitation that can support a direct or partial answer. For an exact named repository, ownership, visibility, technologies, file names, and an explicit unknown-purpose finding are usable evidence.',
      false: 'The document contains no concrete material that can support any part of the answer, including no exact named-project identity or relevant metadata.',
    },
  ),
} as const

function isProbability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function readNoulProbability(answers: Record<string, unknown>, key: string): number {
  const answer = answers[key]
  if (!answer || typeof answer !== 'object') throw new Error(DECISION_ERROR)
  const value = answer as { type?: unknown; noul?: unknown }
  if (value.type !== 'noul' || !isProbability(value.noul)) throw new Error(DECISION_ERROR)
  return value.noul
}

export interface JevKnowledgeRelevanceConfig {
  apiKey: string
  timeoutMs?: number
}

export function createJevKnowledgeRelevanceGate(
  config: JevKnowledgeRelevanceConfig,
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): KnowledgeRelevancePort {
  const apiKey = config.apiKey.trim()
  if (!apiKey) throw new Error('Missing required server environment variable: TYPESAFE_API_KEY')

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Jev knowledge relevance configuration is invalid')

  const client = new TypeSafeClient({
    apiKey,
    defaultModel: 'jev-latest',
    timeout: timeoutMs,
    retry: { maxRetries: 0, apiConnectionError: false, apiTimeoutError: false },
    logLevel: 'off',
    ...(fetcher ? { fetch: fetcher } : {}),
  })

  return {
    async assess(input): Promise<KnowledgeRelevanceScores> {
      let reported = false
      try {
        const response = await client.systemOne({
          state: {
            query: input.query.slice(0, MAX_QUERY_LENGTH),
            document: {
              id: input.candidate.id.slice(0, MAX_DOCUMENT_ID_LENGTH),
              title: input.candidate.source.title.slice(0, MAX_DOCUMENT_TITLE_LENGTH),
              source_type: input.candidate.source.type,
              text: input.candidate.text.slice(0, MAX_DOCUMENT_TEXT_LENGTH),
            },
          },
          questions: RELEVANCE_QUESTIONS,
        })
        input.onModelCall?.({
          provider: 'jev',
          operation: 'rag_relevance',
          model: response.model,
          status: 'succeeded',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        })
        reported = true
        const answers = response.answers as unknown as Record<string, unknown>
        return {
          isRelevantProbability: readNoulProbability(answers, 'is_relevant'),
          answerEvidenceProbability: readNoulProbability(answers, 'contains_answer_evidence'),
        }
      } catch {
        if (!reported) input.onModelCall?.({ provider: 'jev', operation: 'rag_relevance', status: 'failed' })
        throw new Error(DECISION_ERROR)
      }
    },
  }
}
