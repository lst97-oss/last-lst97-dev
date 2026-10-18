import type { KnowledgeChunk } from './repository'
import type { KnowledgeDocument } from './source-types'

export interface KnowledgeTextChunk extends Omit<KnowledgeChunk, 'embedding'> {
  id: string
}

export interface ChunkingOptions {
  maxChars?: number
  overlapChars?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isHighSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff
}

function isLowSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff
}

function adjustCodePointBoundary(text: string, boundary: number): number {
  if (boundary <= 0 || boundary >= text.length) return boundary
  if (isHighSurrogate(text.charCodeAt(boundary - 1)) && isLowSurrogate(text.charCodeAt(boundary))) return boundary + 1
  if (isLowSurrogate(text.charCodeAt(boundary)) && isHighSurrogate(text.charCodeAt(boundary - 1))) return boundary - 1
  return boundary
}

export function lexicalToPlainText(value: unknown): string {
  if (!isRecord(value)) return ''
  const root = isRecord(value.root) ? value.root : value
  const blocks = new Set(['paragraph', 'heading', 'listitem', 'quote', 'code', 'horizontalrule'])
  const headingLevel = (node: Record<string, unknown>): number => {
    const tag = typeof node.tag === 'string' ? node.tag.toLowerCase() : ''
    return /^h[1-6]$/.test(tag) ? Number(tag[1]) : 2
  }
  const readNode = (node: unknown): string => {
    if (!isRecord(node)) return ''
    const type = typeof node.type === 'string' ? node.type : ''
    if (type === 'text') return typeof node.text === 'string' ? node.text : ''
    if (type === 'linebreak' || type === 'tab') return type === 'tab' ? '\t' : '\n'
    const children = Array.isArray(node.children) ? node.children.map(readNode).join('') : ''
    // A heading keeps its Markdown marker so the text can be split on structure
    // rather than by character count. Without it a heading is indistinguishable
    // from a body line once it leaves this function.
    if (type === 'heading' && children) return `${'#'.repeat(headingLevel(node))} ${children.trim()}\n`
    return blocks.has(type) && children ? `${children}\n` : children
  }

  const text = Array.isArray(root.children) ? root.children.map(readNode).join('') : readNode(root)
  return normalizeText(text)
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex')
}

function resolveChunkBounds(options: ChunkingOptions): { maxChars: number; overlapChars: number } {
  const maxChars = options.maxChars ?? 1_200
  const overlapChars = options.overlapChars ?? 160
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error('Chunk maximum must be a positive integer')
  if (!Number.isInteger(overlapChars) || overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error('Chunk overlap must be non-negative and smaller than the maximum')
  }
  return { maxChars, overlapChars }
}

function documentPrefix(document: KnowledgeDocument): string {
  const prefix = document.chunkContextPrefix?.trim()
  return prefix ? `${prefix}\n\n` : ''
}

function buildChunk(document: KnowledgeDocument, chunkIndex: number, chunkText: string): KnowledgeTextChunk {
  const contentHash = sha256(chunkText)
  return {
    id: `${document.source.type}:${document.source.sourceId}:${chunkIndex}:${contentHash.slice(0, 12)}`,
    source: document.source,
    chunkIndex,
    text: chunkText,
    contentHash,
    isPublic: document.isPublic,
    sourceUpdatedAt: document.sourceUpdatedAt,
  }
}

/**
 * Windows `document.text` on a sliding character budget and prepends the
 * document's `chunkContextPrefix` to every chunk. The prefix is concatenated
 * rather than budgeted, which keeps the chunk count a function of the body
 * alone — a long title must not change how many chunks a document produces.
 * Repeating it on every chunk is the point of the prefix: the window only
 * preserves the start of the text, so without it a later chunk carries no
 * document context at all.
 */
export function chunkKnowledgeDocument(
  document: KnowledgeDocument,
  options: ChunkingOptions = {},
): KnowledgeTextChunk[] {
  const { maxChars, overlapChars } = resolveChunkBounds(options)

  const text = normalizeText(document.text)
  if (!text) return []
  const prefix = documentPrefix(document)

  const chunks: KnowledgeTextChunk[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)
    if (end < text.length) {
      const whitespace = text.lastIndexOf(' ', end)
      const newline = text.lastIndexOf('\n', end)
      const boundary = Math.max(whitespace, newline)
      if (boundary > start + Math.floor(maxChars * 0.55)) end = boundary
    }
    end = adjustCodePointBoundary(text, end)

    const chunkText = text.slice(start, end).trim()
    if (chunkText) chunks.push(buildChunk(document, chunks.length, `${prefix}${chunkText}`.trim()))

    if (end >= text.length) break
    start = adjustCodePointBoundary(text, Math.max(start + 1, end - overlapChars))
  }

  return chunks
}

const HEADING_LINE = /^(#{1,6})\s+(.+?)\s*$/
const MAX_BREADCRUMB_CHARS = 200

interface HeadingSegment {
  /**
   * The headings that enclose this segment, outermost first, with the
   * segment's own heading excluded — that heading travels with the segment
   * text. Empty for a preamble before the first heading.
   */
  ancestry: string[]
  text: string
}

/**
 * Splits Markdown on heading boundaries and records each segment's enclosing
 * heading path. A nested section's chunk then carries the ancestry its own
 * heading line does not state, so the section context survives chunking
 * without repeating the section's own heading.
 */
function splitHeadingSegments(text: string): HeadingSegment[] {
  const segments: HeadingSegment[] = []
  const headingStack: string[] = []
  let ancestry: string[] = []
  let current: string[] = []
  const flush = () => {
    if (current.length > 0) segments.push({ ancestry, text: current.join('\n') })
    current = []
  }
  for (const line of text.split('\n')) {
    const heading = line.match(HEADING_LINE)
    if (heading) {
      flush()
      // HEADING_LINE requires both groups, so the defaults only satisfy the
      // indexed-access type — a match always carries hashes and a title.
      const [, hashes = '', title = ''] = heading
      const level = hashes.length
      ancestry = headingStack.slice(0, level - 1).filter(Boolean)
      headingStack.length = level - 1
      headingStack[level - 1] = title.trim()
    }
    current.push(line)
  }
  flush()
  return segments
}

function breadcrumbPrefix(ancestry: string[]): string {
  if (ancestry.length === 0) return ''
  const path = ancestry.join(' → ')
  return `## ${path.length > MAX_BREADCRUMB_CHARS ? path.slice(0, MAX_BREADCRUMB_CHARS) : path}\n\n`
}

/**
 * Splits on Markdown heading boundaries instead of a character window, so a
 * chunk never straddles a section. The prefix is concatenated rather than
 * budgeted, which keeps the chunk count a function of the body alone — a long
 * title must not change how many chunks a document produces.
 *
 * Overlap is deliberately not carried across a heading: it would re-introduce
 * exactly the boundary-smearing that splitting on headings removes. It is only
 * forwarded to the sliding window used for a single oversized section.
 */
export function chunkHeadingDelimitedDocument(
  document: KnowledgeDocument,
  options: ChunkingOptions = {},
): KnowledgeTextChunk[] {
  const { maxChars, overlapChars } = resolveChunkBounds(options)
  const text = normalizeText(document.text)
  if (!text) return []

  const prefix = documentPrefix(document)
  const chunks: KnowledgeTextChunk[] = []
  // Groups of small adjacent segments carry the breadcrumb of their first
  // member: the group opens on that heading, and the later members' own
  // headings travel with their text.
  let groupBreadcrumb = ''
  const emit = (group: string) => {
    const trimmed = group.trim()
    if (trimmed) chunks.push(buildChunk(document, chunks.length, `${prefix}${groupBreadcrumb}${trimmed}`.trim()))
    groupBreadcrumb = ''
  }

  let group = ''
  for (const segment of splitHeadingSegments(text)) {
    const trimmedSegment = segment.text.trim()
    if (!trimmedSegment) continue
    const breadcrumb = breadcrumbPrefix(segment.ancestry)
    if (trimmedSegment.length > maxChars) {
      emit(group)
      group = ''
      // Window the section body on its own, then prefix every resulting chunk.
      // Prefixing the section before windowing would put the prefix on the first
      // chunk only, so the rest of a long section would lose its document title.
      const windowed = chunkKnowledgeDocument(
        { ...document, text: trimmedSegment, chunkContextPrefix: undefined },
        { maxChars, overlapChars },
      )
      for (const chunk of windowed) {
        chunks.push(buildChunk(document, chunks.length, `${prefix}${breadcrumb}${chunk.text}`.trim()))
      }
      continue
    }
    const candidate = group ? `${group}\n\n${trimmedSegment}` : trimmedSegment
    if (group && candidate.length > maxChars) {
      emit(group)
      group = trimmedSegment
      groupBreadcrumb = breadcrumb
      continue
    }
    if (!group) groupBreadcrumb = breadcrumb
    group = candidate
  }
  emit(group)

  return chunks
}
