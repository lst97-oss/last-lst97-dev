import { describe, expect, it } from 'bun:test'

import { parseInterviewDocument } from '../../src/server/knowledge/interview-document'

describe('interview Markdown document parser', () => {
  const body = 'I would always perform the calculation using integer cents rather than floating-point numbers.'
  const document = [
    '# An expense of $100 is split equally among three people. How would you handle the remaining cents?',
    '',
    '- **Category:** Applied Project Questions',
    '- **Source ID:** remaining-cents-split',
    '- **URL:** https://www.lst97.dev/chat',
    '',
    body,
  ].join('\n')

  it('builds a public interview document whose embedded text carries the question', () => {
    const parsed = parseInterviewDocument('src/data/interview/remaining-cents-split.md', document)

    expect(parsed?.source.type).toBe('interview')
    expect(parsed?.source.sourceId).toBe('remaining-cents-split')
    expect(parsed?.source.title).toBe(
      'An expense of $100 is split equally among three people. How would you handle the remaining cents?',
    )
    expect(parsed?.source.url).toBe('https://www.lst97.dev/chat')
    expect(parsed?.isPublic).toBe(true)
    expect(parsed?.text).toBe(
      `## Applied Project Questions\n\n### An expense of $100 is split equally among three people. How would you handle the remaining cents?\n\n${body}`,
    )
  })

  it('rejects a document without a source id line', () => {
    const missingSourceId = document.replace('- **Source ID:** remaining-cents-split\n', '')

    expect(parseInterviewDocument('src/data/interview/remaining-cents-split.md', missingSourceId)).toBeNull()
  })

  it('rejects a source id that disagrees with the file name', () => {
    expect(parseInterviewDocument('src/data/interview/gnaf-autocomplete-request-flow.md', document)).toBeNull()
  })

  it('rejects a path outside the interview corpus so it can never index the GitHub corpus', () => {
    expect(parseInterviewDocument('src/data/github/public/remaining-cents-split.md', document)).toBeNull()
    expect(parseInterviewDocument('remaining-cents-split.md', document)).toBeNull()
    expect(parseInterviewDocument('src/data/interview/remaining-cents-split.txt', document)).toBeNull()
  })

  it('rejects a URL that cannot be parsed, which retrieval would drop from citations', () => {
    const brokenUrl = document.replace('https://www.lst97.dev/chat', 'www.lst97.dev/chat')

    expect(parseInterviewDocument('src/data/interview/remaining-cents-split.md', brokenUrl)).toBeNull()
  })
})
