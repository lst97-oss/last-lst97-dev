import type { ChatMessage, ChatTopicAnchor } from '../chat/types'
import type { ChatModelCallDiagnostic, ChatRagRetrievalDiagnostic } from '../observability/chat-diagnostics'
import type { Logger } from '../observability/logger'
import type { ProjectCatalogBreakdownEntry, ProjectCatalogQuery } from './project-catalog'
import { resolveKnowledgeQuery } from './query-resolution'
import type { KnowledgeIndexRepository, KnowledgeProjectRecord } from './repository'
import type {
  EmbeddingPort,
  KnowledgeCandidate,
  KnowledgeRelevancePort,
  KnowledgeRelevanceScores,
  RankedKnowledgeCandidate,
  RerankerPort,
} from './types'

const VECTOR_CANDIDATE_LIMIT = 10
const FINAL_CANDIDATE_LIMIT = 3
const DEFAULT_EVIDENCE_BUDGET = 5_000
const MIN_RELEVANCE_PROBABILITY = 0.6
const MIN_ANSWER_EVIDENCE_PROBABILITY = 0.6

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
  diagnostics?: {
    onModelCall?: (call: ChatModelCallDiagnostic) => void
    onRetrieval?: (retrieval: ChatRagRetrievalDiagnostic) => void
  }
}

export interface RetrieveKnowledgeResult {
  evidence: KnowledgeEvidence[]
  citations: PublicCitation[]
  degraded: boolean
}

export interface RetrieveKnowledge {
  execute(input: RetrieveKnowledgeInput): Promise<RetrieveKnowledgeResult>
  listOwnedProjects(input: ProjectCatalogQuery): Promise<{
    projects: KnowledgeProjectRecord[]
    hasMore: boolean
    matchingTotal: number
    breakdown: ProjectCatalogBreakdownEntry[]
  }>
}

export interface RetrieveKnowledgeDependencies {
  embedding: EmbeddingPort
  repository: Pick<
    KnowledgeIndexRepository,
    'search' | 'searchExactProjectName' | 'searchByKeyword' | 'listOwnedProjects'
  >
  reranker: RerankerPort
  relevanceGate: KnowledgeRelevancePort
  logger: Logger
  evidenceBudget?: number
  now?: () => number
}

function exactProjectIdentifier(query: string): string | null {
  if (!/\b(?:project|repository|repo|codebase)\b/i.test(query)) return null
  const match = query.match(/\b[A-Z0-9][A-Za-z0-9]*(?:[-_.][A-Za-z0-9]+)+\b/i)
  return match?.[0] ?? null
}

function wantsDemoLinks(query: string): boolean {
  return /\b(demo|demos|live\s+(?:site|demo|url)|deployed|deployment)\b/i.test(query)
}

function sourceIdentity(candidate: KnowledgeCandidate): string {
  return `${candidate.source.type}:${candidate.source.sourceId}`
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
    if (
      !candidate ||
      !identity ||
      seen.has(candidate.id) ||
      seen.has(identity) ||
      !isPublicCitationUrl(candidate.source.url)
    )
      continue
    seen.add(candidate.id)
    seen.add(identity)
    selected.push(candidate)
    if (selected.length === FINAL_CANDIDATE_LIMIT) break
  }
  return selected
}

type CandidateRelevanceAssessment = {
  candidate: KnowledgeCandidate
  status: 'accepted' | 'fallback' | 'rejected'
  scores?: KnowledgeRelevanceScores
}

function isValidRelevanceScores(value: unknown): value is KnowledgeRelevanceScores {
  if (!value || typeof value !== 'object') return false
  const scores = value as Partial<KnowledgeRelevanceScores>
  return [scores.isRelevantProbability, scores.answerEvidenceProbability].every(
    (score) => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1,
  )
}

async function assessRelevantCandidates(
  query: string,
  candidates: KnowledgeCandidate[],
  relevanceGate: KnowledgeRelevancePort,
  onModelCall?: (call: ChatModelCallDiagnostic) => void,
): Promise<{ candidates: KnowledgeCandidate[]; fallbackCount: number; assessments: CandidateRelevanceAssessment[] }> {
  const assessments = await Promise.all(
    candidates.map(async (candidate): Promise<CandidateRelevanceAssessment> => {
      try {
        const scores = await relevanceGate.assess({ query, candidate, onModelCall })
        if (!isValidRelevanceScores(scores)) return { candidate, status: 'fallback' }
        const accepted =
          scores.isRelevantProbability >= MIN_RELEVANCE_PROBABILITY &&
          scores.answerEvidenceProbability >= MIN_ANSWER_EVIDENCE_PROBABILITY
        return { candidate, status: accepted ? 'accepted' : 'rejected', scores }
      } catch {
        return { candidate, status: 'fallback' }
      }
    }),
  )
  return {
    candidates: assessments
      .filter(({ status }) => status === 'accepted' || status === 'fallback')
      .map(({ candidate }) => candidate),
    fallbackCount: assessments.filter(({ status }) => status === 'fallback').length,
    assessments,
  }
}

export function createRetrieveKnowledge(dependencies: RetrieveKnowledgeDependencies): RetrieveKnowledge {
  const now = dependencies.now ?? (() => performance.now())
  const evidenceBudget = Math.max(
    1,
    Math.min(20_000, Math.floor(dependencies.evidenceBudget ?? DEFAULT_EVIDENCE_BUDGET)),
  )

  return {
    async listOwnedProjects(input) {
      return dependencies.repository.listOwnedProjects(input)
    },

    async execute(input) {
      const message = input.message.trim().slice(0, 2_000)
      if (!message) throw new Error('Knowledge query is required')
      const startedAt = now()
      const query = resolveKnowledgeQuery(message, input.verifiedHistory, input.topicAnchors)
      const projectIdentifier = exactProjectIdentifier(query)
      const vector = await dependencies.embedding.embed({
        text: query,
        kind: 'query',
        onModelCall: input.diagnostics?.onModelCall,
      })
      const [semanticCandidates, exactCandidates, demoCandidates] = await Promise.all([
        dependencies.repository.search(vector, VECTOR_CANDIDATE_LIMIT),
        projectIdentifier && dependencies.repository.searchExactProjectName
          ? dependencies.repository.searchExactProjectName(projectIdentifier, 3)
          : Promise.resolve([]),
        wantsDemoLinks(query) && dependencies.repository.searchByKeyword
          ? dependencies.repository.searchByKeyword('demo', 6)
          : Promise.resolve([]),
      ])
      const candidates: KnowledgeCandidate[] = []
      const candidateIds = new Set<string>()
      for (const candidate of [...exactCandidates, ...demoCandidates, ...semanticCandidates]) {
        if (candidateIds.has(candidate.id)) continue
        candidateIds.add(candidate.id)
        candidates.push(candidate)
        if (candidates.length >= VECTOR_CANDIDATE_LIMIT) break
      }
      if (candidates.length === 0) {
        dependencies.logger.info('knowledge.retrieval.completed', {
          candidateCount: 0,
          resultCount: 0,
          durationMs: Math.max(0, Math.round(now() - startedAt)),
        })
        input.diagnostics?.onRetrieval?.({ query, degraded: false, candidates: [] })
        return { evidence: [], citations: [], degraded: false }
      }

      const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
      const rerankScores = new Map<string, number>()
      let selected: KnowledgeCandidate[]
      let degraded = false
      try {
        const ranked = await dependencies.reranker.rerank({
          query,
          candidates: candidates.slice(0, VECTOR_CANDIDATE_LIMIT),
          limit: FINAL_CANDIDATE_LIMIT,
          onModelCall: input.diagnostics?.onModelCall,
        })
        for (const item of ranked) rerankScores.set(item.id, item.relevanceScore)
        selected = selectTrustedCandidates(ranked, candidatesById)
      } catch {
        degraded = true
        const seenSources = new Set<string>()
        selected = candidates
          .filter((candidate) => {
            const identity = `${candidate.source.type}:${candidate.source.sourceId}`
            if (!isPublicCitationUrl(candidate.source.url) || seenSources.has(identity)) return false
            seenSources.add(identity)
            return true
          })
          .slice(0, FINAL_CANDIDATE_LIMIT)
        dependencies.logger.warn('knowledge.rerank.fallback', { reason: 'provider_failure' })
      }

      const exactCandidate = exactCandidates.find((candidate) => isPublicCitationUrl(candidate.source.url))
      const relevanceById = new Map<string, CandidateRelevanceAssessment>()
      if (selected.length > 0) {
        const candidateCount = selected.length
        const relevance = await assessRelevantCandidates(
          query,
          selected,
          dependencies.relevanceGate,
          input.diagnostics?.onModelCall,
        )
        for (const assessment of relevance.assessments) relevanceById.set(assessment.candidate.id, assessment)
        selected = relevance.candidates
        if (relevance.fallbackCount > 0) {
          degraded = true
          dependencies.logger.warn('knowledge.relevance_gate.fallback', {
            candidateCount,
            fallbackCount: relevance.fallbackCount,
          })
        }
      }

      // An exact normalized title/source-id match is direct evidence that the
      // requested project is indexed. Keep its record even if semantic reranking
      // or the probabilistic relevance gate under-ranks it; it can still report
      // supported metadata and explicitly unknown project details.
      if (exactCandidate) {
        const exactIdentity = sourceIdentity(exactCandidate)
        selected = [
          exactCandidate,
          ...selected.filter((candidate) => sourceIdentity(candidate) !== exactIdentity),
        ].slice(0, FINAL_CANDIDATE_LIMIT)
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

      const finalSelectedIds = new Set(evidence.map(({ id }) => id))
      input.diagnostics?.onRetrieval?.({
        query,
        degraded,
        candidates: candidates.slice(0, VECTOR_CANDIDATE_LIMIT).map((candidate, index) => {
          const assessment = relevanceById.get(candidate.id)
          return {
            id: candidate.id,
            sourceId: candidate.source.sourceId,
            sourceType: candidate.source.type,
            title: candidate.source.title,
            isPublic: candidate.isPublic,
            excerpt: candidate.text.slice(0, 300),
            retrievedRank: index + 1,
            ...(rerankScores.has(candidate.id) ? { rerankScore: rerankScores.get(candidate.id) } : {}),
            ...(assessment?.scores
              ? {
                  relevanceProbability: assessment.scores.isRelevantProbability,
                  answerEvidenceProbability: assessment.scores.answerEvidenceProbability,
                }
              : {}),
            outcome: assessment?.status ?? 'not_ranked',
            finalSelected: finalSelectedIds.has(candidate.id),
          }
        }),
      })

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
