import { describe, expect, it } from 'bun:test'

import { parseBlogDocument } from '../../src/server/knowledge/blog-document'

describe('blog Markdown document parser', () => {
  const body =
    'AI has dramatically reduced the cost of producing code. It has not removed the need to engineer reliable software.'
  const document = [
    '# What AI Changed',
    '',
    '- **Category:** AI-Assisted Development',
    '- **Source ID:** code-is-cheap-what-ai-changed',
    '- **URL:** https://www.lst97.dev/blog/code-is-cheap-software-is-not',
    '',
    body,
  ].join('\n')

  const blogPath = 'src/data/blog/code-is-cheap-software-is-not/code-is-cheap-what-ai-changed.md'

  it('builds a public blog document whose embedded text carries the blog marker, category and title', () => {
    const parsed = parseBlogDocument(blogPath, document)

    expect(parsed?.source.type).toBe('blog')
    expect(parsed?.source.sourceId).toBe('code-is-cheap-what-ai-changed')
    expect(parsed?.source.title).toBe('What AI Changed')
    expect(parsed?.source.url).toBe('https://www.lst97.dev/blog/code-is-cheap-software-is-not')
    expect(parsed?.isPublic).toBe(true)
    // The prefix is the only context a heading-unaware chunk keeps, so it is
    // where the blog marker, the category and the title have to live.
    expect(parsed?.text).toBe('## Blog\n\n## AI-Assisted Development\n\n### What AI Changed\n\n' + body)
  })

  it('derives the post from the folder rather than from anything the body claims', () => {
    // The same text under another post folder belongs to that post.
    // Nothing in the body says so, which is the point: the folder decides.
    const otherPath = 'src/data/blog/how-software-engineers-use-ai-differently/code-is-cheap-what-ai-changed.md'
    const otherDocument = document.replaceAll(
      'https://www.lst97.dev/blog/code-is-cheap-software-is-not',
      'https://www.lst97.dev/blog/how-software-engineers-use-ai-differently',
    )

    expect(parseBlogDocument(blogPath, document)?.source.url).toBe(
      'https://www.lst97.dev/blog/code-is-cheap-software-is-not',
    )
    expect(parseBlogDocument(otherPath, otherDocument)?.source.url).toBe(
      'https://www.lst97.dev/blog/how-software-engineers-use-ai-differently',
    )
  })

  it('rejects a document whose folder is not a post, rather than defaulting to one', () => {
    expect(parseBlogDocument('src/data/blog/shared/code-is-cheap-what-ai-changed.md', document)).toBeNull()
    // A flat document has no post folder at all.
    expect(parseBlogDocument('src/data/blog/code-is-cheap-what-ai-changed.md', document)).toBeNull()
    // Nested one level too deep is not a post folder either.
    expect(
      parseBlogDocument(
        'src/data/blog/code-is-cheap-software-is-not/nested/code-is-cheap-what-ai-changed.md',
        document,
      ),
    ).toBeNull()
  })

  it('rejects a source id that disagrees with the file name', () => {
    expect(parseBlogDocument('src/data/blog/code-is-cheap-software-is-not/other-slug.md', document)).toBeNull()
  })

  it('accepts a source id that differs from the folder, since the folder is the post and the file is the topic', () => {
    expect(parseBlogDocument(blogPath, document)).not.toBeNull()
  })

  it('rejects a document missing a metadata line that a chunk would depend on', () => {
    for (const line of [
      '- **Category:** AI-Assisted Development\n',
      '- **Source ID:** code-is-cheap-what-ai-changed\n',
      '- **URL:** https://www.lst97.dev/blog/code-is-cheap-software-is-not\n',
    ]) {
      expect(parseBlogDocument(blogPath, document.replace(line, ''))).toBeNull()
    }
  })

  it('rejects a URL that cannot be parsed, which retrieval would drop from citations', () => {
    const brokenUrl = document.replace(
      'https://www.lst97.dev/blog/code-is-cheap-software-is-not',
      'www.lst97.dev/blog/code-is-cheap-software-is-not',
    )

    expect(parseBlogDocument(blogPath, brokenUrl)).toBeNull()
  })

  it('rejects a URL for a different post, so a chunk can never cite the wrong article', () => {
    const wrongUrl = document.replace(
      'https://www.lst97.dev/blog/code-is-cheap-software-is-not',
      'https://www.lst97.dev/blog/how-software-engineers-use-ai-differently',
    )

    expect(parseBlogDocument(blogPath, wrongUrl)).toBeNull()
  })

  it('rejects a path outside the blog corpus so it can never index another corpus', () => {
    expect(parseBlogDocument('src/data/interview/blog/code-is-cheap-what-ai-changed.md', document)).toBeNull()
    expect(parseBlogDocument('src/data/services/packages/blog/code-is-cheap-what-ai-changed.md', document)).toBeNull()
    expect(parseBlogDocument('blog/code-is-cheap-what-ai-changed.md', document)).toBeNull()
    expect(
      parseBlogDocument('src/data/blog/code-is-cheap-software-is-not/code-is-cheap-what-ai-changed.txt', document),
    ).toBeNull()
  })
})
