import type { ChatModelCallDiagnostic } from '../observability/chat-diagnostics'

export type KnowledgeSourceType =
  | 'post'
  | 'project'
  | 'profile'
  | 'interview'
  | 'project-doc'
  | 'services'
  | 'github'
  | 'github-private'
  | 'github-profile'
  | 'github-contrib'
  | 'github-contrib-private'
  | 'wakatime'

export interface KnowledgeSourceReference {
  type: KnowledgeSourceType
  sourceId: string
  title: string
  url: string
}

export interface KnowledgeCandidate {
  id: string
  text: string
  /** False for sanitized private-repository summaries; surfaced to chat with a private marker. */
  isPublic: boolean
  source: KnowledgeSourceReference
}

export interface RankedKnowledgeCandidate extends KnowledgeCandidate {
  relevanceScore: number
}

export interface KnowledgeRelevanceScores {
  isRelevantProbability: number
  answerEvidenceProbability: number
}

export interface KnowledgeRelevancePort {
  assess(input: {
    query: string
    candidate: KnowledgeCandidate
    onModelCall?: (call: ChatModelCallDiagnostic) => void
  }): Promise<KnowledgeRelevanceScores>
}

export interface EmbeddingPort {
  embed(input: {
    text: string
    kind: 'query' | 'document'
    onModelCall?: (call: ChatModelCallDiagnostic) => void
  }): Promise<number[]>
  /**
   * Embeds several texts, returning vectors in input order. Indexing one
   * document otherwise costs one HTTP round-trip per chunk.
   */
  embedMany(input: {
    texts: string[]
    kind: 'query' | 'document'
    onModelCall?: (call: ChatModelCallDiagnostic) => void
  }): Promise<number[][]>
}

export interface RerankerPort {
  rerank(input: {
    query: string
    candidates: KnowledgeCandidate[]
    limit: number
    onModelCall?: (call: ChatModelCallDiagnostic) => void
  }): Promise<RankedKnowledgeCandidate[]>
}
