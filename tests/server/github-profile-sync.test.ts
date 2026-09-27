import { describe, expect, it } from 'bun:test'

import { syncGithubProfileDocument } from '../../src/server/knowledge/github-profile-sync'
import type { KnowledgeDocument } from '../../src/server/knowledge/source-types'

function document(text: string): KnowledgeDocument {
  return {
    source: {
      type: 'github-profile',
      sourceId: 'lst97-profile',
      title: 'Nelson (LST97) profile',
      url: 'https://github.com/lst97',
    },
    text,
    isPublic: true,
    sourceUpdatedAt: null,
  }
}

describe('GitHub profile document sync', () => {
  it('does not index or write unsafe profile Markdown', async () => {
    const calls: string[] = []

    await expect(syncGithubProfileDocument({
      document: document('# Profile\nOPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnopqrstuvwxyz123456'),
      outputPath: '/data/profile.md',
      async indexDocument() { calls.push('index') },
      async writeAtomically() { calls.push('write') },
    })).rejects.toThrow()

    expect(calls).toEqual([])
  })

  it('keeps the existing Markdown when the vector upsert fails', async () => {
    const calls: string[] = []

    await expect(syncGithubProfileDocument({
      document: document('# Safe profile'),
      outputPath: '/data/profile.md',
      async indexDocument() { calls.push('index'); throw new Error('database write failed') },
      async writeAtomically() { calls.push('write') },
    })).rejects.toThrow('database write failed')

    expect(calls).toEqual(['index'])
  })

  it('indexes before atomically writing the same Markdown with a trailing newline', async () => {
    const calls: string[] = []
    const written: Array<{ path: string; text: string }> = []

    await syncGithubProfileDocument({
      document: document('# Safe profile'),
      outputPath: '/data/profile.md',
      async indexDocument(indexed) { calls.push(`index:${indexed.source.sourceId}`) },
      async writeAtomically(path, text) { calls.push('write'); written.push({ path, text }) },
    })

    expect(calls).toEqual(['index:lst97-profile', 'write'])
    expect(written).toEqual([{ path: '/data/profile.md', text: '# Safe profile\n' }])
  })
})
