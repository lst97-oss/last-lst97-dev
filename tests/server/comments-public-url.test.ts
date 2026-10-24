import { describe, expect, it } from 'bun:test'
import { contentPageUrl } from '../../src/server/comments/public-url'

describe('contentPageUrl', () => {
  it('builds the same canonical URL the site renders for each collection', () => {
    expect(contentPageUrl('https://www.lst97.dev', 'posts', 'a-note')).toBe('https://www.lst97.dev/blog/a-note')
    expect(contentPageUrl('https://www.lst97.dev', 'projects', 'last-os')).toBe(
      'https://www.lst97.dev/projects/last-os',
    )
    expect(contentPageUrl('https://www.lst97.dev', 'changelogs', 'v1-2-0')).toBe(
      'https://www.lst97.dev/changelog/v1-2-0',
    )
  })

  it('ignores a trailing slash on the site origin', () => {
    expect(contentPageUrl('https://www.lst97.dev/', 'posts', 'a-note')).toBe('https://www.lst97.dev/blog/a-note')
  })
})
