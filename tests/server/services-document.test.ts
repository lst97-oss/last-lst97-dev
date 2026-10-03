import { describe, expect, it } from 'bun:test'

import {
  isServicesOffering,
  parseServicesDocument,
  SERVICES_OFFERING_LABELS,
} from '../../src/server/knowledge/services-document'

describe('services Markdown document parser', () => {
  const body =
    'The Starter package costs from A$1,000 and suits simple business websites and a professional online presence.'
  const document = [
    '# How much does a website cost?',
    '',
    '- **Topic:** Packages and Pricing',
    '- **Source ID:** packages-and-pricing',
    '- **URL:** https://www.lst97.dev/services',
    '',
    body,
  ].join('\n')

  const packagesPath = 'src/data/services/packages/packages-and-pricing.md'

  it('builds a public services document whose embedded text carries the offering, topic and question', () => {
    const parsed = parseServicesDocument(packagesPath, document)

    expect(parsed?.source.type).toBe('services')
    expect(parsed?.source.sourceId).toBe('packages-and-pricing')
    expect(parsed?.source.title).toBe('How much does a website cost?')
    expect(parsed?.source.url).toBe('https://www.lst97.dev/services')
    expect(parsed?.isPublic).toBe(true)
    // The prefix is the only context a heading-unaware chunk keeps, so it is
    // where the offering, the topic and the question have to live.
    expect(parsed?.text).toBe(
      `## ${SERVICES_OFFERING_LABELS.packages}\n\n## Packages and Pricing\n\n### How much does a website cost?\n\n${body}`,
    )
  })

  it('derives the offering from the folder rather than from anything the body claims', () => {
    // The same text under `support/` is a support document. Nothing in the body
    // says so, which is the point: the folder is the only source of truth.
    const supportPath = 'src/data/services/support/packages-and-pricing.md'

    expect(parseServicesDocument(packagesPath, document)?.text).toStartWith(`## ${SERVICES_OFFERING_LABELS.packages}`)
    expect(parseServicesDocument(supportPath, document)?.text).toStartWith(`## ${SERVICES_OFFERING_LABELS.support}`)
  })

  it('recognises only the two offering folders, and no inherited object key', () => {
    expect(isServicesOffering('packages')).toBe(true)
    expect(isServicesOffering('support')).toBe(true)
    expect(isServicesOffering('unknown')).toBe(false)
    // A prototype key must not pass: it is not an offering.
    expect(isServicesOffering('constructor')).toBe(false)
    expect(isServicesOffering('toString')).toBe(false)
  })

  it('rejects a document whose folder is not an offering, rather than defaulting to one', () => {
    expect(parseServicesDocument('src/data/services/shared/packages-and-pricing.md', document)).toBeNull()
    // A flat document has no offering folder at all.
    expect(parseServicesDocument('src/data/services/packages-and-pricing.md', document)).toBeNull()
    // Nested one level too deep is not an offering folder either.
    expect(parseServicesDocument('src/data/services/support/nested/packages-and-pricing.md', document)).toBeNull()
  })

  it('rejects a document without a source id line', () => {
    const missingSourceId = document.replace('- **Source ID:** packages-and-pricing\n', '')

    expect(parseServicesDocument(packagesPath, missingSourceId)).toBeNull()
  })

  it('rejects a document without a topic line, because a chunk would carry no topic context', () => {
    const missingTopic = document.replace('- **Topic:** Packages and Pricing\n', '')

    expect(parseServicesDocument(packagesPath, missingTopic)).toBeNull()
  })

  it('rejects a source id that disagrees with the file name', () => {
    expect(parseServicesDocument('src/data/services/packages/add-ons.md', document)).toBeNull()
  })

  it('rejects a path outside the services corpus so it can never index the interview corpus', () => {
    expect(parseServicesDocument('src/data/interview/packages/packages-and-pricing.md', document)).toBeNull()
    expect(parseServicesDocument('src/data/github/public/packages/packages-and-pricing.md', document)).toBeNull()
    expect(parseServicesDocument('packages/packages-and-pricing.md', document)).toBeNull()
    expect(parseServicesDocument('src/data/services/packages/packages-and-pricing.txt', document)).toBeNull()
  })

  it('rejects a URL that cannot be parsed, which retrieval would drop from citations', () => {
    const brokenUrl = document.replace('https://www.lst97.dev/services', 'www.lst97.dev/services')

    expect(parseServicesDocument(packagesPath, brokenUrl)).toBeNull()
  })
})
