/**
 * The repository root, for CLI scripts that address project files.
 *
 * Scripts live one or two directories below `scripts/`, so this walks up from
 * `import.meta.dir` until it finds the directory holding `package.json`. Each
 * script used to strip a literal `/scripts` suffix off its own directory, which
 * silently produced a wrong path the moment a script was nested a level deeper —
 * `scripts/knowledge/sync-github-knowledge.ts` would resolve `…/knowledge` as if
 * it were the root. Deriving from `package.json` is depth-independent.
 *
 * Absolute, with no trailing separator. Scripts that spawn a child with `cwd`
 * need this: a child resolves relative paths against the parent process, so a
 * script invoked from another directory would otherwise read the wrong tree.
 *
 * Bun-native: `Bun.file().exists()` and `import.meta.dir` only. The walk is
 * async because `exists()` is promise-based, so `projectRoot` is a top-level
 * await; every consumer is already an async script entry point.
 */

/** Drops the last path segment. POSIX and Windows separators both handled. */
function parentOf(directory: string): string {
  const trimmed = directory.replace(/[/\\]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  // No separator left means this is a filesystem root, which cannot go higher.
  if (cut <= 0) return trimmed
  return trimmed.slice(0, cut)
}

async function findProjectRoot(start: string): Promise<string> {
  let current = start
  // Terminates at a filesystem root, where `parentOf` stops changing; a missing
  // package.json is a hard error rather than an unbounded walk.
  for (;;) {
    if (await Bun.file(`${current}/package.json`).exists()) return current
    const parent = parentOf(current)
    if (parent === current) {
      throw new Error(`Could not find package.json above ${start}`)
    }
    current = parent
  }
}

export const projectRoot = await findProjectRoot(import.meta.dir)
