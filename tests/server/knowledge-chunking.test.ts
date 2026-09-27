import { describe, expect, it } from 'bun:test'

import { chunkKnowledgeDocument, lexicalToPlainText } from '../../src/server/knowledge/chunking'
import type { KnowledgeDocument } from '../../src/server/knowledge/source-types'

const document: KnowledgeDocument = {
  source: { type: 'post', sourceId: 'post-7', title: 'Reliable services', url: 'https://example.test/blog/reliable-services' },
  text: Array.from({ length: 40 }, (_, index) => `paragraph${index}`).join(' '),
  isPublic: true,
  sourceUpdatedAt: new Date('2026-09-22T00:00:00Z'),
}

describe('knowledge chunking', () => {
  it('creates deterministic bounded chunks with overlap and stable provenance', () => {
    const first = chunkKnowledgeDocument(document, { maxChars: 80, overlapChars: 20 })
    const second = chunkKnowledgeDocument(document, { maxChars: 80, overlapChars: 20 })

    expect(first.length).toBeGreaterThan(1)
    expect(first.map(({ id, contentHash }) => [id, contentHash])).toEqual(second.map(({ id, contentHash }) => [id, contentHash]))
    expect(first.every(({ text }) => text.length <= 80)).toBe(true)
    expect(first[0]?.source).toEqual(document.source)
    expect(first[0]?.text.slice(-20)).toBe(first[1]?.text.slice(0, 20))
    expect(first[0]?.contentHash).toMatch(/^[\da-f]{64}$/)
  })

  it('returns no chunks for whitespace-only text', () => {
    expect(chunkKnowledgeDocument({ ...document, text: ' \n\t ' })).toEqual([])
  })

  it('never splits a Unicode surrogate pair across a chunk boundary', () => {
    const text = `${'a'.repeat(79)}😀${'b'.repeat(80)}`
    const chunks = chunkKnowledgeDocument({ ...document, text }, { maxChars: 80, overlapChars: 20 })

    expect(chunks.map(({ text: chunk }) => chunk).join('')).toContain('😀')
    expect(chunks.every(({ text: chunk }) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(chunk))).toBe(true)
  })

  it('normalizes Lexical nodes into readable ordered text', () => {
    expect(lexicalToPlainText({
      root: { children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Built ' }, { type: 'text', text: 'useful tools.' }] },
        { type: 'heading', children: [{ type: 'text', text: 'Open source' }] },
        { type: 'list', children: [{ type: 'listitem', children: [{ type: 'text', text: 'Typed APIs' }] }] },
      ] },
    })).toBe('Built useful tools.\nOpen source\nTyped APIs')
  })

  it('validates chunk bounds and does not loop for tiny settings', () => {
    expect(() => chunkKnowledgeDocument(document, { maxChars: 20, overlapChars: 20 })).toThrow('smaller than the maximum')
  })
})
