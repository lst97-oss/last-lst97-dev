import { assertSafeGithubMarkdown } from './github-content-safety'

export interface RemoveSupersededGithubReportsDependencies {
  candidates: string[]
  read(path: string): Promise<string>
  remove(path: string): Promise<void>
}

export async function removeSupersededGithubReports(
  dependencies: RemoveSupersededGithubReportsDependencies,
): Promise<{ removedCount: number; retainedCount: number }> {
  let removedCount = 0
  let retainedCount = 0
  for (const legacyPath of dependencies.candidates) {
    if (!legacyPath.endsWith('.md.md')) continue
    const canonicalPath = legacyPath.slice(0, -3)
    try {
      const [legacy, canonical] = await Promise.all([
        dependencies.read(legacyPath),
        dependencies.read(canonicalPath),
      ])
      if (!legacy.trim() || !canonical.trim()) throw new Error('A report is empty')
      assertSafeGithubMarkdown(legacy)
      assertSafeGithubMarkdown(canonical)
      await dependencies.remove(legacyPath)
      removedCount += 1
    } catch {
      retainedCount += 1
    }
  }
  return { removedCount, retainedCount }
}
