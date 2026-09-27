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
}

export interface KnowledgeSource {
  type: KnowledgeSourceType
  fetch(sourceId: string): Promise<KnowledgeDocument | null>
}
