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
  const readNode = (node: unknown): string => {
    if (!isRecord(node)) return ''
    const type = typeof node.type === 'string' ? node.type : ''
    if (type === 'text') return typeof node.text === 'string' ? node.text : ''
    if (type === 'linebreak' || type === 'tab') return type === 'tab' ? '\t' : '\n'
    const children = Array.isArray(node.children) ? node.children.map(readNode).join('') : ''
    return blocks.has(type) && children ? `${children}\n` : children
  }

  const text = Array.isArray(root.children) ? root.children.map(readNode).join('') : readNode(root)
  return normalizeText(text)
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex')
}

export function chunkKnowledgeDocument(
  document: KnowledgeDocument,
  options: ChunkingOptions = {},
): KnowledgeTextChunk[] {
  const maxChars = options.maxChars ?? 1_200
  const overlapChars = options.overlapChars ?? 160
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error('Chunk maximum must be a positive integer')
  if (!Number.isInteger(overlapChars) || overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error('Chunk overlap must be non-negative and smaller than the maximum')
  }

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
    if (chunkText) {
      const contentHash = sha256(chunkText)
      const chunkIndex = chunks.length
      chunks.push({
        id: `${document.source.type}:${document.source.sourceId}:${chunkIndex}:${contentHash.slice(0, 12)}`,
        source: document.source,
        chunkIndex,
        text: chunkText,
        contentHash,
        isPublic: document.isPublic,
        sourceUpdatedAt: document.sourceUpdatedAt,
      })
    }

    if (end >= text.length) break
    start = adjustCodePointBoundary(text, Math.max(start + 1, end - overlapChars))
  }

  return chunks
}
