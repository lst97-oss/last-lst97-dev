import type { ProjectSoftwareKind } from './project-catalog'
import type { KnowledgeSourceReference, KnowledgeSourceType } from './types'

export interface KnowledgeProjectCatalogMetadata {
  summary: string
  createdAt: string | null
  updatedAt: string | null
  stars: number | null
  forks: number | null
  primaryLanguage: string | null
  languages: string[]
  kinds: ProjectSoftwareKind[]
  githubTopics: string[]
  curatedTopics: string[]
}

export interface KnowledgeDocument {
  source: KnowledgeSourceReference
  text: string
  isPublic: boolean
  sourceUpdatedAt: Date | null
  projectCatalog?: KnowledgeProjectCatalogMetadata
  /**
   * Documents whose text carries heading markers, split on those markers instead
   * of the generic sliding window. The Markdown corpora (interview, services,
   * project-doc) author `##`/`###` headings too but keep the sliding window:
   * their boundaries were authored deliberately and are already retrieval-tuned.
   */
  headingDelimited?: boolean
  /**
   * Prepended to every chunk of this document, unlike the document text itself
   * which the sliding window only preserves for the first chunk.
   */
  chunkContextPrefix?: string
}

export interface KnowledgeSource {
  type: KnowledgeSourceType
  fetch(sourceId: string): Promise<KnowledgeDocument | null>
}
