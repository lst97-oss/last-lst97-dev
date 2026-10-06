import { describe, expect, it } from 'bun:test'

import { parseBlogDocument } from '../../src/server/knowledge/blog-document'

/**
 * Guards the committed corpus itself, not a synthetic fixture. The parser is
 * covered by `blog-document.test.ts`; what this file proves is that every
 * document actually on disk parses, that each post keeps its own folder, and
 * that every document is public.
 *
 * A malformed file here fails the index run at deploy time rather than being
 * silently skipped, but a corpus that stopped parsing would otherwise only be
 * discovered by a missing search result.
 */
const BLOG_GLOB = 'src/data/blog/*/*.md'

const EXPECTED_TOPICS: Record<string, readonly string[]> = {
  'code-is-cheap-software-is-not': [
    'code-is-cheap-before-ai',
    'code-is-cheap-what-ai-changed',
    'code-is-cheap-vibe-coding-works',
    'code-is-cheap-engineered-not-working',
    'code-is-cheap-4000-line-website',
    'code-is-cheap-what-developers-add',
    'code-is-cheap-security-difference',
    'code-is-cheap-engineering-judgment',
    'code-is-cheap-ai-guardrails',
    'code-is-cheap-dependencies-review',
    'code-is-cheap-why-hire-developers',
    'code-is-cheap-future',
  ],
  'how-software-engineers-use-ai-differently': [
    'engineers-ai-code-generator',
    'engineers-ai-orchestration',
    'engineers-problem-decomposition',
    'engineers-bounded-pieces',
    'engineers-picture-in-head',
    'engineers-constrain-ai',
    'engineers-readability-matters',
    'engineers-ai-debugging',
    'engineers-ai-testing',
    'engineers-sql-multiplier',
    'engineers-code-review',
    'engineers-production-boundaries',
    'engineers-documentation-changed',
    'engineers-syntax-vs-engineering',
    'engineers-more-full-stack',
    'engineers-hard-projects',
    'engineers-decision-making',
  ],
  'what-junior-developer-means-when-ai-can-code': [
    'junior-old-model',
    'junior-waits-for-tickets',
    'junior-level-by-ability',
    'junior-learn-more',
    'junior-syntax-cheap',
    'junior-security-fundamentals',
    'junior-system-design-early',
    'junior-communication-skill',
    'junior-hiring-curiosity',
    'junior-portfolio-projects',
    'junior-real-projects',
    'junior-leetcode-proxy',
    'junior-interviews-with-ai',
    'junior-focus-and-future',
  ],
}

const EXPECTED_TOPIC_COUNT = Object.values(EXPECTED_TOPICS).reduce((total, topics) => total + topics.length, 0)

async function readCorpus() {
  const entries: { relativePath: string; text: string }[] = []
  for await (const relativePath of new Bun.Glob(BLOG_GLOB).scan('.')) {
    entries.push({ relativePath, text: await Bun.file(relativePath).text() })
  }
  return entries
}

describe('blog corpus', () => {
  it('parses every committed blog document', async () => {
    const entries = await readCorpus()
    expect(entries.length).toBe(EXPECTED_TOPIC_COUNT)

    for (const { relativePath, text } of entries) {
      const parsed = parseBlogDocument(relativePath, text)
      expect(parsed).not.toBeNull()
      expect(parsed?.source.type).toBe('blog')
    }
  })

  it('keeps one file per topic with the file matching its source id', async () => {
    const entries = await readCorpus()
    const paths = new Set(entries.map(({ relativePath }) => relativePath))

    for (const [post, topics] of Object.entries(EXPECTED_TOPICS)) {
      expect(topics.length).toBeGreaterThan(1)
      for (const topic of topics) {
        expect(paths.has(`src/data/blog/${post}/${topic}.md`)).toBe(true)
      }
    }
  })

  it('keeps each document uniquely identified, since source identity is the dedupe key', async () => {
    const entries = await readCorpus()
    const identities = entries.map(({ relativePath, text }) => {
      const parsed = parseBlogDocument(relativePath, text)
      return `${parsed?.source.type}:${parsed?.source.sourceId}`
    })

    expect(new Set(identities).size).toBe(identities.length)
  })

  it('stamps every blog document public, since articles are visitor-facing', async () => {
    const entries = await readCorpus()

    for (const { relativePath, text } of entries) {
      const parsed = parseBlogDocument(relativePath, text)
      expect(parsed?.isPublic).toBe(true)
    }
  })

  it('states the blog marker before anything else', async () => {
    const entries = await readCorpus()

    for (const { relativePath, text } of entries) {
      const parsed = parseBlogDocument(relativePath, text)
      // Chunking is a heading-unaware sliding window, so a chunk taken from the
      // middle of a document carries only this prefix. If the blog line ever
      // stops coming first, a mid-document chunk answers with no idea it came
      // from an article.
      expect(parsed?.text.startsWith('## Blog\n\n')).toBe(true)
    }
  })

  it('carries no unrendered Markdown fence, which would store diagram source as prose', async () => {
    const entries = await readCorpus()

    for (const { text } of entries) {
      expect(text.includes('```')).toBe(false)
    }
  })
})
