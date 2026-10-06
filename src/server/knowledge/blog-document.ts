import type { KnowledgeDocument } from './source-types'

const BLOG_DIRECTORY = 'blog'

const POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const metadataPattern = (name: string) => new RegExp(`^- \\*\\*${name}:\\*\\*\\s+([^\\n]+)$`, 'm')

/**
 * Parses one hand-authored blog topic from `src/data/blog/<post>/<topic>.md`
 * into a public knowledge document. Each post folder holds one file per
 * topic, mirroring the one-file-per-topic layout of `src/data/projects/`.
 *
 * Mirrors `parseProjectDocument` and `parseServicesDocument` so the corpora
 * stay independently parseable: the metadata keys (`Category`, `Source ID`,
 * `URL`) match the sibling parsers, but the `source.type` literal differs
 * because it is the source identity in the index.
 *
 * Unlike the project/services corpora there is no fixed label map: the
 * immediate parent folder names the post and every file in it shares the
 * post's canonical `/blog/<post>` URL, while the file name and the Source ID
 * name the topic within the post.
 */
export function parseBlogDocument(path: string, text: string): KnowledgeDocument | null {
  const normalizedPath = path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  if (!normalizedPath.endsWith('.md')) return null
  // Exactly `…/blog/<post>/<topic>.md`. A flat document and a document nested
  // deeper than one folder are both rejected rather than defaulting to a
  // post, because every chunk prefix states only the category and a guessed
  // post would misattribute a chunk.
  const post = segments.at(-2)
  if (segments.at(-3) !== BLOG_DIRECTORY) return null
  if (post === undefined || !POST_SLUG_PATTERN.test(post)) return null

  const title = text.match(/^#\s+(.+)\s*$/m)?.[1]?.trim()
  const category = text.match(metadataPattern('Category'))?.[1]?.trim()
  const sourceId = text.match(metadataPattern('Source ID'))?.[1]?.trim()
  const urlText = text.match(metadataPattern('URL'))?.[1]?.trim()
  if (!title || !category || !sourceId || !urlText) return null
  if (segments.at(-1) !== `${sourceId}.md`) return null
  if (!POST_SLUG_PATTERN.test(sourceId)) return null
  if (!URL.canParse(urlText)) return null

  const url = new URL(urlText)
  if (url.pathname !== `/blog/${post}`) return null

  const metadataEnd = text.indexOf(urlText) + urlText.length
  const body = text.slice(metadataEnd).trim()
  if (!body) return null

  return {
    source: { type: 'blog', sourceId, title, url: url.href },
    // Chunking is a heading-unaware sliding window over `text` alone, so this
    // prefix is the only context a chunk carries. The `## Blog` line comes
    // first: a chunk that begins mid-document still states it is a blog
    // article before it states anything else, because the row's source_type
    // is not part of the chunk text.
    text: `## Blog\n\n## ${category}\n\n### ${title}\n\n${body}`,
    isPublic: true,
    sourceUpdatedAt: null,
  }
}
