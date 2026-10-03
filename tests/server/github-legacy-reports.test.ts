import { describe, expect, it } from 'bun:test'

import { removeSupersededGithubReports } from '../../src/server/knowledge/github/legacy-reports'

describe('superseded GitHub reports', () => {
  it('removes only a safe legacy duplicate after its canonical report has been written', async () => {
    const files = new Map([
      ['/data/public/demo.md.md', '# Old metadata'],
      ['/data/public/demo.md', '# Consolidated clone-backed report'],
      ['/data/public/only-legacy.md.md', '# No replacement yet'],
    ])
    const removed: string[] = []

    const result = await removeSupersededGithubReports({
      candidates: [...files.keys()].filter((path) => path.endsWith('.md.md')),
      async read(path) {
        return files.get(path) ?? ''
      },
      async remove(path) {
        removed.push(path)
        files.delete(path)
      },
    })

    expect(result).toEqual({ removedCount: 1, retainedCount: 1 })
    expect(removed).toEqual(['/data/public/demo.md.md'])
    expect(files.has('/data/public/only-legacy.md.md')).toBe(true)
  })

  it('retains an unsafe legacy report rather than deleting the only usable copy', async () => {
    const files = new Map([
      ['/data/public/demo.md.md', '# Old\ncontact owner@example.com'],
      ['/data/public/demo.md', '# Consolidated report'],
    ])
    const result = await removeSupersededGithubReports({
      candidates: ['/data/public/demo.md.md'],
      async read(path) {
        return files.get(path) ?? ''
      },
      async remove(path) {
        files.delete(path)
      },
    })

    expect(result).toEqual({ removedCount: 0, retainedCount: 1 })
    expect(files.has('/data/public/demo.md.md')).toBe(true)
  })
})
