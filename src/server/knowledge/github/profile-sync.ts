import type { KnowledgeDocument } from '../source-types'
import { assertSafeGithubMarkdown } from './content-safety'

export interface SyncGithubProfileDocumentInput {
  document: KnowledgeDocument
  outputPath: string
  indexDocument(document: KnowledgeDocument): Promise<void>
  writeAtomically(path: string, text: string): Promise<void>
}

export async function syncGithubProfileDocument(input: SyncGithubProfileDocumentInput): Promise<void> {
  assertSafeGithubMarkdown(input.document.text)
  await input.indexDocument(input.document)
  const markdown = `${input.document.text.trimEnd()}\n`
  await input.writeAtomically(input.outputPath, markdown)
}
