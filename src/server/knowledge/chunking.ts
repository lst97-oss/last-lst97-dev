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

export function chunkKnowledgeDocument(
  document: KnowledgeDocument,
  options: ChunkingOptions = {},
): KnowledgeTextChunk[] {
  const { maxChars, overlapChars } = resolveChunkBounds(options)

  const text = normalizeText(document.text)
  if (!text) return []

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
    if (chunkText) chunks.push(buildChunk(document, chunks.length, chunkText))

    if (end >= text.length) break
    start = adjustCodePointBoundary(text, Math.max(start + 1, end - overlapChars))
  }

  return chunks
}

const HEADING_LINE = /^#{1,6}\s/

function splitHeadingSegments(text: string): string[] {
  const segments: string[] = []
  let current: string[] = []
  for (const line of text.split('\n')) {
    if (HEADING_LINE.test(line) && current.length > 0) {
      segments.push(current.join('\n'))
      current = []
    }
    current.push(line)
  }
  if (current.length > 0) segments.push(current.join('\n'))
  return segments
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
  const emit = (group: string) => {
    const trimmed = group.trim()
    if (trimmed) chunks.push(buildChunk(document, chunks.length, `${prefix}${trimmed}`.trim()))
  }

  let group = ''
  for (const segment of splitHeadingSegments(text)) {
    const trimmedSegment = segment.trim()
    if (!trimmedSegment) continue
    if (trimmedSegment.length > maxChars) {
      emit(group)
      group = ''
      const windowed = chunkKnowledgeDocument(
        { ...document, text: `${prefix}${trimmedSegment}`, chunkContextPrefix: undefined },
        { maxChars, overlapChars },
      )
      for (const chunk of windowed) chunks.push(buildChunk(document, chunks.length, chunk.text))
      continue
    }
    const candidate = group ? `${group}\n\n${trimmedSegment}` : trimmedSegment
    if (group && candidate.length > maxChars) {
      emit(group)
      group = trimmedSegment
      continue
    }
    group = candidate
  }
  emit(group)

  return chunks
}
