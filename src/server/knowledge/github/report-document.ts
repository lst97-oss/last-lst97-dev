import { projectSoftwareKindSchema } from '../project-catalog'
import type { KnowledgeDocument } from '../source-types'
import type { KnowledgeSourceType } from '../types'

const repositoryIdentityPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

function metadataValue(text: string, name: string): string | null {
  return text.match(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'))?.[1]?.trim() ?? null
}

function parseDate(value: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null
  return value
}

function parseCountPair(text: string): { stars: number | null; forks: number | null } {
  const match = text.match(/^- \*\*Stars \/ forks:\*\* (\d+) \/ (\d+)$/m)
  if (!match?.[1] || !match[2]) return { stars: null, forks: null }
  return { stars: Number(match[1]), forks: Number(match[2]) }
}

function parseTagLine(value: string | null): string[] {
  if (!value || /^(?:no |none|unknown)/i.test(value)) return []
  return value
    .split(',')
    .map((entry) => entry.trim().replace(/^`|`$/g, ''))
    .filter(Boolean)
}

function parseProjectCatalog(text: string) {
  const retrievalSummary = text.match(/^## Retrieval summary\s*\n([\s\S]*?)(?=^## |\s*$)/m)?.[1] ?? ''
  const purpose = retrievalSummary.match(/^- \*\*(?:Purpose|Owner-provided purpose):\*\*\s*(.+)$/m)?.[1]?.trim()
  const summary =
    purpose ??
    retrievalSummary
      .split('\n')
      .map((line) => line.replace(/^- /, '').trim())
      .find((line) => line && !/^(?:Relationship:|Repository:|Project demo:)/.test(line)) ??
    'Purpose not recorded in the indexed evidence.'
  const kinds = parseTagLine(metadataValue(text, 'Software kinds')).flatMap((value) => {
    const parsed = projectSoftwareKindSchema.safeParse(value)
    return parsed.success ? [parsed.data] : []
  })
  const languages = new Set<string>()
  const primaryLanguage = metadataValue(text, 'Primary language')
  if (primaryLanguage && !/^(?:none|unknown|not specified)$/i.test(primaryLanguage)) languages.add(primaryLanguage)
  const languageSection = text.split(/^### GitHub language breakdown\s*$/m)[1] ?? ''
  const breakdown = languageSection.split(/^#{2,3} /m)[0] ?? ''
  for (const line of breakdown.split('\n')) {
    const language = line.match(/^- ([^()\n]+) \([\d,]+ bytes\)$/)?.[1]?.trim()
    if (language && !/^(?:none|unknown|not specified)/i.test(language)) languages.add(language)
  }
  const counts = parseCountPair(text)
  return {
    summary: summary.slice(0, 500),
    createdAt: parseDate(metadataValue(text, 'Created')),
    updatedAt: parseDate(metadataValue(text, 'Last updated')),
    ...counts,
    primaryLanguage:
      primaryLanguage && !/^(?:none|unknown|not specified)$/i.test(primaryLanguage) ? primaryLanguage : null,
    languages: [...languages],
    kinds,
    githubTopics: parseTagLine(metadataValue(text, 'Topics')),
    curatedTopics: parseTagLine(metadataValue(text, 'Curated topics')),
  }
}

export function parseGithubReportDocument(path: string, text: string): KnowledgeDocument | null {
  const normalizedPath = path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  const isContribution = segments.includes('contributions')
  const visibility = segments.at(-2)
  if (visibility !== 'public' && visibility !== 'private') return null
  if (!normalizedPath.endsWith('.md')) return null

  const title = text.match(/^#\s+(.+)\s*$/m)?.[1]?.trim()
  const sourceId = text.match(/^- \*\*Repository:\*\*\s+([^\n]+)$/m)?.[1]?.trim()
  const declaredVisibility = text.match(/^- \*\*Visibility:\*\*\s+(public|private)\s*$/m)?.[1]
  const urlText = text.match(/^- \*\*URL:\*\*\s+(https:\/\/[^\s]+)\s*$/m)?.[1]
  if (
    !title ||
    !sourceId ||
    !repositoryIdentityPattern.test(sourceId) ||
    declaredVisibility !== visibility ||
    !urlText ||
    !URL.canParse(urlText)
  ) {
    return null
  }

  const url = new URL(urlText)
  const name = sourceId.split('/').at(-1) ?? ''
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.pathname.replace(/\/$/, '') !== `/${sourceId}` ||
    segments.at(-1) !== `${isContribution ? sourceId.replace('/', '__') : name}.md`
  ) {
    return null
  }

  const sourceType: KnowledgeSourceType = isContribution
    ? visibility === 'private'
      ? 'github-contrib-private'
      : 'github-contrib'
    : visibility === 'private'
      ? 'github-private'
      : 'github'

  return {
    source: { type: sourceType, sourceId, title, url: url.href },
    text,
    isPublic: visibility === 'public',
    sourceUpdatedAt: null,
    ...(!isContribution ? { projectCatalog: parseProjectCatalog(text) } : {}),
  }
}
