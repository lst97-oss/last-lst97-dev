import type { KnowledgeDocument } from './source-types'

const PROJECTS_DIRECTORY = 'projects'

/**
 * The immediate parent folder of a project document names the project it
 * describes, and it is the structural source of truth for that fact: the parser
 * rejects a document whose folder is not a known project rather than trusting
 * prose. The folder is what lets the corpus be split one file per topic per
 * project — `src/data/projects/<project>/<source-id>.md` — without a document
 * having to restate its own identity in every chunk.
 *
 * The label is injected into the prefix of every chunk because chunking is a
 * heading-unaware sliding window over `document.text` (`chunking.ts`), so that
 * prefix is the only context a chunk carries into retrieval. Without it a chunk
 * taken from the middle of the G-NAF ingestion document would answer a question
 * about address search with database loading detail and no idea which project
 * it belonged to.
 *
 * This mirrors `parseServicesDocument`: the folder decides the offering there
 * and the project here, and in both cases a mismatch is rejected rather than
 * defaulted, because a wrong label is worse than a failed index run.
 */
const PROJECT_LABELS = {
  'gnaf-address-autocomplete': 'G-NAF Address Autocomplete',
  'smartplay-hk-oss': 'SmartPlay HK OSS',
  'wat-wat-new-zealand': 'Wat Wat New Zealand',
} as const

export type ProjectDocProject = keyof typeof PROJECT_LABELS

export function isProjectDocProject(value: string): value is ProjectDocProject {
  return Object.hasOwn(PROJECT_LABELS, value)
}

/**
 * Projects whose source repository is private. Their documents are still
 * retrievable — the model may describe what such a project does and how it
 * works — but the citation is stamped `isPublic: false` so the responder never
 * claims a visitor can open the source.
 *
 * This is stated in the document's own `**Visibility:**` metadata and asserted
 * against the folder here, so moving a document into the wrong folder fails the
 * index run instead of silently publishing or mislabelling a private project.
 */
const PRIVATE_PROJECT_LABELS: Readonly<Record<ProjectDocProject, string>> = {
  'gnaf-address-autocomplete': 'Public',
  'smartplay-hk-oss': 'Public',
  'wat-wat-new-zealand': 'Private',
}

const metadataPattern = (name: string) => new RegExp(`^- \\*\\*${name}:\\*\\*\\s+([^\\n]+)$`, 'm')

/**
 * Parses one hand-authored project deep-dive document from
 * `src/data/projects/<project>/<source-id>.md` into a knowledge document.
 *
 * Mirrors `parseInterviewDocument` and `parseServicesDocument` so the three
 * corpora stay independently parseable; the metadata keys differ
 * (`Category` is shared with interview, `Visibility` is unique here) and so does
 * the `source.type` literal, which is the source identity in the index.
 */
export function parseProjectDocument(path: string, text: string): KnowledgeDocument | null {
  const normalizedPath = path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  if (!normalizedPath.endsWith('.md')) return null
  // Exactly `…/projects/<project>/<source-id>.md`. A flat document and a
  // document nested deeper than one folder are both rejected rather than
  // defaulting to a project, because every chunk prefix states the project and
  // a guessed one attributes a chunk to the wrong build.
  const project = segments.at(-2)
  if (segments.at(-3) !== PROJECTS_DIRECTORY) return null
  if (project === undefined || !isProjectDocProject(project)) return null

  const title = text.match(/^#\s+(.+)\s*$/m)?.[1]?.trim()
  const category = text.match(metadataPattern('Category'))?.[1]?.trim()
  const sourceId = text.match(metadataPattern('Source ID'))?.[1]?.trim()
  const urlText = text.match(metadataPattern('URL'))?.[1]?.trim()
  const visibility = text.match(metadataPattern('Visibility'))?.[1]?.trim()
  if (!title || !category || !sourceId || !urlText || !visibility) return null
  if (segments.at(-1) !== `${sourceId}.md`) return null
  if (!URL.canParse(urlText)) return null
  if (visibility !== PRIVATE_PROJECT_LABELS[project]) return null

  const url = new URL(urlText)
  // The body starts after the LAST metadata line, not the URL: `Visibility`
  // follows the URL in the authored format, so slicing at the URL would leave
  // the visibility line in the body and duplicate it in every chunk prefix.
  const metadataEnd = text.indexOf(`- **Visibility:** ${visibility}`) + `- **Visibility:** ${visibility}`.length
  const body = text.slice(metadataEnd).trim()
  if (!body) return null

  return {
    source: { type: 'project-doc', sourceId, title, url: url.href },
    // Chunking is a heading-unaware sliding window over `text` alone, so this
    // prefix is the only context a chunk carries. The project line comes first:
    // a chunk that begins mid-document still states which project it describes
    // before it states anything else.
    text: `## Project: ${PROJECT_LABELS[project]}\n\n## ${category}\n\n### ${title}\n\n${body}`,
    isPublic: visibility === 'Public',
    sourceUpdatedAt: null,
  }
}
