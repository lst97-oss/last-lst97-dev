import type { ChatMessage, ChatTopicAnchor } from '../chat/types'
import type { Logger } from '../observability/logger'
import type { EmbeddingPort, KnowledgeCandidate, RankedKnowledgeCandidate, RerankerPort } from './types'
import type { KnowledgeIndexRepository } from './repository'
import { resolveKnowledgeQuery } from './query-resolution'

const VECTOR_CANDIDATE_LIMIT = 10
const FINAL_CANDIDATE_LIMIT = 3
const DEFAULT_EVIDENCE_BUDGET = 5_000

export interface KnowledgeEvidence extends KnowledgeCandidate {
  citationId: string
}

export interface PublicCitation {
  id: string
  title: string
  url: string
  isPublic: boolean
}

export interface RetrieveKnowledgeInput {
  message: string
  verifiedHistory: ChatMessage[]
  topicAnchors?: ChatTopicAnchor[]
}

export interface RetrieveKnowledgeResult {
  evidence: KnowledgeEvidence[]
  citations: PublicCitation[]
  degraded: boolean
}

export interface RetrieveKnowledge {
  execute(input: RetrieveKnowledgeInput): Promise<RetrieveKnowledgeResult>
}

export interface RetrieveKnowledgeDependencies {
  embedding: EmbeddingPort
  repository: Pick<KnowledgeIndexRepository, 'search'>
  reranker: RerankerPort
  logger: Logger
  evidenceBudget?: number
  now?: () => number
}

function isPublicCitationUrl(value: string): boolean {
  if (!URL.canParse(value)) return false
  const protocol = new URL(value).protocol
  return protocol === 'https:' || protocol === 'http:'
}

function selectTrustedCandidates(
  ranked: RankedKnowledgeCandidate[],
  candidatesById: Map<string, KnowledgeCandidate>,
): KnowledgeCandidate[] {
  const selected: KnowledgeCandidate[] = []
  const seen = new Set<string>()
  for (const item of ranked) {
    const candidate = candidatesById.get(item.id)
    // Dedupe by source identity (type + sourceId), not chunk id: several
    // chunks from the same profile/post otherwise surface as K1/K2/K3 with
    // the identical title and URL.
    const identity = candidate ? `${candidate.source.type}:${candidate.source.sourceId}` : null
    if (!candidate || !identity || seen.has(candidate.id) || seen.has(identity) || !isPublicCitationUrl(candidate.source.url)) continue
    seen.add(candidate.id)
    seen.add(identity)
    selected.push(candidate)
    if (selected.length === FINAL_CANDIDATE_LIMIT) break
  }
  return selected
}

export function createRetrieveKnowledge(dependencies: RetrieveKnowledgeDependencies): RetrieveKnowledge {
  const now = dependencies.now ?? (() => performance.now())
  const evidenceBudget = Math.max(1, Math.min(20_000, Math.floor(dependencies.evidenceBudget ?? DEFAULT_EVIDENCE_BUDGET)))

  return {
    async execute(input) {
      const message = input.message.trim().slice(0, 2_000)
      if (!message) throw new Error('Knowledge query is required')
      const startedAt = now()
      const query = resolveKnowledgeQuery(message, input.verifiedHistory, input.topicAnchors)
      const vector = await dependencies.embedding.embed({ text: query, kind: 'query' })
      const candidates = await dependencies.repository.search(vector, VECTOR_CANDIDATE_LIMIT)
      if (candidates.length === 0) {
        dependencies.logger.info('knowledge.retrieval.completed', {
          candidateCount: 0,
          resultCount: 0,
          durationMs: Math.max(0, Math.round(now() - startedAt)),
        })
        return { evidence: [], citations: [], degraded: false }
      }

      const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
      let selected: KnowledgeCandidate[]
      let degraded = false
      try {
        const ranked = await dependencies.reranker.rerank({
          query,
          candidates: candidates.slice(0, VECTOR_CANDIDATE_LIMIT),
          limit: FINAL_CANDIDATE_LIMIT,
        })
        selected = selectTrustedCandidates(ranked, candidatesById)
      } catch {
        degraded = true
        const seenSources = new Set<string>()
        selected = candidates.filter((candidate) => {
          const identity = `${candidate.source.type}:${candidate.source.sourceId}`
          if (!isPublicCitationUrl(candidate.source.url) || seenSources.has(identity)) return false
          seenSources.add(identity)
          return true
        }).slice(0, FINAL_CANDIDATE_LIMIT)
        dependencies.logger.warn('knowledge.rerank.fallback', { reason: 'provider_failure' })
      }

      let remaining = evidenceBudget
      const evidence: KnowledgeEvidence[] = []
      for (const candidate of selected) {
        if (remaining <= 0) break
        const text = candidate.text.slice(0, remaining).trim()
        if (!text) continue
        const citationId = `K${evidence.length + 1}`
        evidence.push({ ...candidate, citationId, text })
        remaining -= text.length
      }
      const citations = evidence.map(({ citationId, source, isPublic }) => ({
        id: citationId,
        title: source.title,
        url: source.url,
        isPublic,
      }))

      dependencies.logger.info('knowledge.retrieval.completed', {
        candidateCount: candidates.length,
        resultCount: evidence.length,
        sourceTypes: [...new Set(evidence.map(({ source }) => source.type))],
        degraded,
        durationMs: Math.max(0, Math.round(now() - startedAt)),
      })
      return { evidence, citations, degraded }
    },
  }
}
