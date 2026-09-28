import type { KnowledgeDocument } from './source-types'

const INTERVIEW_DIRECTORY = 'interview'
const metadataPattern = (name: string) => new RegExp(`^- \\*\\*${name}:\\*\\*\\s+([^\\n]+)$`, 'm')

export function parseInterviewDocument(path: string, text: string): KnowledgeDocument | null {
  const normalizedPath = path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  if (!normalizedPath.endsWith('.md')) return null
  if (segments.at(-2) !== INTERVIEW_DIRECTORY) return null

  const title = text.match(/^#\s+(.+)\s*$/m)?.[1]?.trim()
  const category = text.match(metadataPattern('Category'))?.[1]?.trim()
  const sourceId = text.match(metadataPattern('Source ID'))?.[1]?.trim()
  const urlText = text.match(metadataPattern('URL'))?.[1]?.trim()
  if (!title || !category || !sourceId || !urlText) return null
  if (segments.at(-1) !== `${sourceId}.md`) return null
  if (!URL.canParse(urlText)) return null

  const url = new URL(urlText)
  const metadataEnd = text.indexOf(urlText) + urlText.length
  const body = text.slice(metadataEnd).trim()
  if (!body) return null

  return {
    source: { type: 'interview', sourceId, title, url: url.href },
    text: `## ${category}\n\n### ${title}\n\n${body}`,
    isPublic: true,
    sourceUpdatedAt: null,
  }
}
