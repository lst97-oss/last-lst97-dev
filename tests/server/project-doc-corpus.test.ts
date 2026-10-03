import { describe, expect, it } from 'bun:test'

import { parseProjectDocument } from '../../src/server/knowledge/project-document'

/**
 * Guards the committed corpus itself, not a synthetic fixture. The parser is
 * covered by `project-document.test.ts`; what this file proves is that every
 * document actually on disk parses, that each project's documents stay
 * distinguishable, and that the private project never claims to be public.
 *
 * A malformed file here fails the index run at deploy time rather than being
 * silently skipped, but a corpus that stopped parsing would otherwise only be
 * discovered by a missing search result.
 */
const PROJECT_GLOB = 'src/data/projects/*/*.md'

const EXPECTED_PROJECTS = ['last-os', 'gnaf-address-autocomplete', 'smartplay-hk-oss', 'wat-wat-new-zealand'] as const

async function readCorpus() {
  const entries: { relativePath: string; text: string }[] = []
  for await (const relativePath of new Bun.Glob(PROJECT_GLOB).scan('.')) {
    entries.push({ relativePath, text: await Bun.file(relativePath).text() })
  }
  return entries
}

describe('project deep-dive corpus', () => {
  it('parses every committed project document', async () => {
    const entries = await readCorpus()
    expect(entries.length).toBeGreaterThanOrEqual(EXPECTED_PROJECTS.length)

    for (const { relativePath, text } of entries) {
      const parsed = parseProjectDocument(relativePath, text)
      expect(parsed).not.toBeNull()
      expect(parsed?.source.type).toBe('project-doc')
    }
  })

  it('gives every project at least one deep-dive document', async () => {
    const entries = await readCorpus()

    for (const project of EXPECTED_PROJECTS) {
      const owned = entries.filter(({ relativePath }) => relativePath.startsWith(`src/data/projects/${project}/`))
      expect(owned.length).toBeGreaterThan(0)
    }
  })

  it('keeps each document uniquely identified, since source identity is the dedupe key', async () => {
    const entries = await readCorpus()
    const identities = entries.map(({ relativePath, text }) => {
      const parsed = parseProjectDocument(relativePath, text)
      return `${parsed?.source.type}:${parsed?.source.sourceId}`
    })

    expect(new Set(identities).size).toBe(identities.length)
  })

  it('stamps the private project as non-public and the others as public', async () => {
    const entries = await readCorpus()

    for (const { relativePath, text } of entries) {
      const parsed = parseProjectDocument(relativePath, text)
      const isPrivateProject = relativePath.startsWith('src/data/projects/wat-wat-new-zealand/')

      expect(parsed?.isPublic).toBe(!isPrivateProject)
    }
  })

  it('states which project a chunk belongs to before anything else', async () => {
    const entries = await readCorpus()

    for (const { relativePath, text } of entries) {
      const parsed = parseProjectDocument(relativePath, text)
      // Chunking is a heading-unaware sliding window, so a chunk taken from the
      // middle of a document carries only this prefix. If the project line ever
      // stops coming first, a mid-document chunk answers with no idea which
      // project it came from.
      expect(parsed?.text.startsWith('## Project: ')).toBe(true)
      expect(parsed?.text).not.toContain('- **Visibility:**')
    }
  })

  it('carries no unrendered Markdown fence, which would store diagram source as prose', async () => {
    const entries = await readCorpus()

    for (const { text } of entries) {
      expect(text.includes('```')).toBe(false)
    }
  })
})
