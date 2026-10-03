import type { KnowledgeDocument } from './source-types'

const SERVICES_DIRECTORY = 'services'

/**
 * The immediate parent folder of a services document names the offering it
 * belongs to, and it is the structural source of truth for that fact: the
 * parser rejects a document whose folder is not listed here rather than
 * guessing. Two offerings are sold on `/services` and they are priced on
 * different scales, so a chunk that does not say which one it describes lets
 * the model answer a support question with a website package price.
 *
 * The label is injected into the prefix of every chunk because chunking is a
 * heading-unaware sliding window over `document.text` (`chunking.ts`), so that
 * prefix is the only context a chunk carries into retrieval.
 */
export const SERVICES_OFFERING_LABELS = {
  packages: 'Website Packages — a new website built from scratch',
  support: 'Go Support Plan — technical help for an existing site or application',
} as const

export type ServicesOffering = keyof typeof SERVICES_OFFERING_LABELS

export function isServicesOffering(value: string): value is ServicesOffering {
  return Object.hasOwn(SERVICES_OFFERING_LABELS, value)
}

const metadataPattern = (name: string) => new RegExp(`^- \\*\\*${name}:\\*\\*\\s+([^\\n]+)$`, 'm')

/**
 * Parses one hand-authored commercial document from `src/data/services/` into
 * a public knowledge document. Mirrors `parseInterviewDocument` so the two
 * corpora stay independently parseable: the metadata keys differ (`Topic` vs
 * `Category`) and so do the `source.type` literals, which are the source
 * identity in the index.
 */
export function parseServicesDocument(path: string, text: string): KnowledgeDocument | null {
  const normalizedPath = path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  if (!normalizedPath.endsWith('.md')) return null
  // Exactly `…/services/<offering>/<source-id>.md`. A flat document and a
  // document nested deeper than one folder are both rejected rather than
  // defaulting to an offering, because a guess here is what lets the two
  // offerings' prices mix in one chunk. The offering is the immediate parent
  // and `services` is its parent; reading these two indices the other way round
  // rejected every real document, which surfaced as a parse failure on the
  // first file rather than as a wrong offering.
  const offering = segments.at(-2)
  if (segments.at(-3) !== SERVICES_DIRECTORY) return null
  if (offering === undefined || !isServicesOffering(offering)) return null

  const title = text.match(/^#\s+(.+)\s*$/m)?.[1]?.trim()
  const topic = text.match(metadataPattern('Topic'))?.[1]?.trim()
  const sourceId = text.match(metadataPattern('Source ID'))?.[1]?.trim()
  const urlText = text.match(metadataPattern('URL'))?.[1]?.trim()
  if (!title || !topic || !sourceId || !urlText) return null
  if (segments.at(-1) !== `${sourceId}.md`) return null
  if (!URL.canParse(urlText)) return null

  const url = new URL(urlText)
  const metadataEnd = text.indexOf(urlText) + urlText.length
  const body = text.slice(metadataEnd).trim()
  if (!body) return null

  return {
    source: { type: 'services', sourceId, title, url: url.href },
    // Chunking is a heading-unaware sliding window over `text` alone, so this
    // prefix is the only context a chunk carries. The offering line comes
    // first: a chunk that begins mid-document still states which offering it
    // describes before it states anything else.
    text: `## ${SERVICES_OFFERING_LABELS[offering]}\n\n## ${topic}\n\n### ${title}\n\n${body}`,
    isPublic: true,
    sourceUpdatedAt: null,
  }
}
