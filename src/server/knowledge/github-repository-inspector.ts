import { inspectSensitivePath, sanitizeEvidenceText } from './github-content-safety'

export interface GithubRepositoryInspectionTarget {
  fullName: string
  url: string
  isPrivate: boolean
  defaultBranch?: string | null
}

export interface GithubRepositoryTextFile {
  path: string
  content: string
}

export interface GithubRepositorySnapshot {
  trackedPaths: string[]
  files: GithubRepositoryTextFile[]
}

export interface GithubCommandRunner {
  run(command: string, args: string[], maxOutputBytes?: number): Promise<string>
}

export class GithubCommandOutputTooLargeError extends Error {
  constructor() {
    super('Repository command output exceeded the safe size limit')
    this.name = 'GithubCommandOutputTooLargeError'
  }
}

export type GithubInspectionFailureCategory = 'invalid_target' | 'temporary_directory' | 'clone_failed' | 'tree_command_failed' | 'tree_output_limit' | 'tracked_path_limit' | 'file_read_failed'

export class GithubRepositoryInspectionError extends Error {
  constructor(readonly category: GithubInspectionFailureCategory) {
    super('Repository inspection failed')
    this.name = 'GithubRepositoryInspectionError'
  }
}

const MAX_TRACKED_PATHS = 250_000
const MAX_FILE_BYTES = 256_000
const MAX_TOTAL_READ_BYTES = 1_500_000
const MAX_CODE_FILE_BYTES = 48_000
const MAX_TOTAL_CODE_BYTES = 600_000
const MAX_CODE_FILES = 100
const sourceExtensions = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|kt|swift|cs|php|rb|ex|exs|dart|vue|svelte|html|css|scss)$/i
const allowedRootFiles = new Set([
  'README', 'README.md', 'README.mdx', 'README.txt', 'package.json',
  'pyproject.toml', 'requirements.txt', 'Pipfile', 'Cargo.toml', 'go.mod', 'composer.json',
  'Gemfile', 'build.gradle', 'build.gradle.kts', 'pom.xml', 'mix.exs', 'pubspec.yaml',
])
const allowedConfigNames = new Set([
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.ts', 'next.config.mjs',
  'tsconfig.json', 'vitest.config.ts', 'jest.config.ts', 'playwright.config.ts',
  'Dockerfile', 'docker-compose.yml', 'compose.yaml', 'Cargo.toml', 'go.mod', 'pyproject.toml',
])

function isSafeRepositoryName(value: string): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)
}

function isAllowlistedPath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..')) return false
  const lower = path.toLowerCase()
  if (/(^|\/)(\.git|node_modules|vendor|dist|build|coverage|\.next|\.nuxt|target|\.venv|venv|__pycache__)(\/|$)/i.test(path)) return false
  if (/(^|\/)(\.env[^/]*|.*\.(pem|key|p12|pfx|cer|crt|der|jks|keystore)|.*(secret|credential|token|dump|backup|log).*)$/i.test(path)) return false
  const base = path.split('/').at(-1) ?? ''
  if (allowedRootFiles.has(base) && !path.includes('/')) return true
  if (allowedConfigNames.has(base)) return true
  if (/^(docs|documentation)\/[A-Za-z0-9_. -]+\.mdx?$/.test(path) && !/(secret|credential|token|private|internal)/i.test(lower)) return true
  return false
}

function isAllowlistedSourcePath(path: string): boolean {
  return sourceExtensions.test(path)
    && !/(^|\/)(?:\.git|node_modules|vendor|dist|build|coverage|\.next|\.nuxt|target|\.venv|venv|__pycache__)(\/|$)/i.test(path)
    && !/(^|\/)(?:public|assets?|static)(\/|$)/i.test(path)
    && !inspectSensitivePath(path)
    && !/(^|\/)(?:examples?|fixtures?|snapshots?|generated|mocks?)(\/|$)/i.test(path)
    && !/(^|\/)(?:benches?|benchmarks?)(\/|$)/i.test(path)
    && !/(?:^|\/)(?:.*\.)?(?:min|bundle)\.[^.]+$/i.test(path)
}

function sourceInspectionPriority(path: string): number {
  if (/(^|\/)(?:tests?|__tests__|spec|benches?|benchmarks?|examples?|fixtures?|snapshots?)(\/|$)/i.test(path)) return 3
  if (/(^|\/)scripts\//i.test(path)) return 2
  if (/^(?:src|app|server|lib|pages|packages|cmd|internal|crates)\//i.test(path)) return 0
  if (!path.includes('/')) return 1
  return 2
}

function validateTarget(target: GithubRepositoryInspectionTarget): void {
  if (!isSafeRepositoryName(target.fullName)) throw new GithubRepositoryInspectionError('invalid_target')
  try {
    const url = new URL(target.url)
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.pathname.toLowerCase() !== `/${target.fullName.toLowerCase()}`) {
      throw new Error()
    }
  } catch {
    throw new GithubRepositoryInspectionError('invalid_target')
  }
}

export async function inspectGithubRepository(
  target: GithubRepositoryInspectionTarget,
  temporaryParent: string,
  runner: GithubCommandRunner,
): Promise<GithubRepositorySnapshot> {
  validateTarget(target)
  let temporaryDirectory: string | undefined
  let failureCategory: GithubInspectionFailureCategory = 'temporary_directory'
  try {
    temporaryDirectory = (await runner.run('mktemp', ['-d', `${temporaryParent.replace(/\/$/, '')}/github-inspect.XXXXXXXX`], 4_096)).trim()
    if (!temporaryDirectory || !temporaryDirectory.startsWith(`${temporaryParent.replace(/\/$/, '')}/github-inspect.`)) {
      throw new GithubRepositoryInspectionError('temporary_directory')
    }
    failureCategory = 'clone_failed'
    await runner.run('gh', [
      'repo', 'clone', target.fullName, temporaryDirectory, '--',
      '--depth', '1', '--filter=blob:none', '--no-checkout',
    ], 16_384)
    failureCategory = 'tree_command_failed'
    let trackedOutput: string
    try {
      trackedOutput = await runner.run('git', ['-C', temporaryDirectory, 'ls-tree', '-r', '--name-only', '-z', 'HEAD'], MAX_TRACKED_PATHS * 512)
    } catch (error) {
      try {
        await runner.run('git', ['-C', temporaryDirectory, 'rev-parse', '--verify', 'HEAD'], 4_096)
      } catch {
        return { trackedPaths: [], files: [] }
      }
      failureCategory = error instanceof GithubCommandOutputTooLargeError ? 'tree_output_limit' : 'tree_command_failed'
      throw error
    }
    const trackedPaths = [...new Set(trackedOutput.split(/\0|\r?\n/).filter(Boolean))]
    if (trackedPaths.length > MAX_TRACKED_PATHS) {
      failureCategory = 'tracked_path_limit'
      throw new GithubRepositoryInspectionError('tracked_path_limit')
    }

    const files: GithubRepositoryTextFile[] = []
    let totalBytes = 0
    let totalCodeBytes = 0
    let codeFileCount = 0
    const documentationAndConfig = trackedPaths.filter(isAllowlistedPath)
    const sourcePaths = trackedPaths.filter(isAllowlistedSourcePath)
      .sort((left, right) => sourceInspectionPriority(left) - sourceInspectionPriority(right) || left.localeCompare(right))
      .slice(0, MAX_CODE_FILES)
    for (const path of [...documentationAndConfig, ...sourcePaths]) {
      const remaining = MAX_TOTAL_READ_BYTES - totalBytes
      if (remaining <= 0) break
      const isSource = isAllowlistedSourcePath(path)
      if (isSource && (codeFileCount >= MAX_CODE_FILES || totalCodeBytes >= MAX_TOTAL_CODE_BYTES)) continue
      failureCategory = 'file_read_failed'
      let content: string
      try {
        content = await runner.run('git', ['-C', temporaryDirectory, 'show', `HEAD:${path}`], Math.min(isSource ? MAX_CODE_FILE_BYTES : MAX_FILE_BYTES, isSource ? MAX_TOTAL_CODE_BYTES - totalCodeBytes : remaining))
      } catch (error) {
        if (error instanceof GithubCommandOutputTooLargeError) continue
        throw error
      }
      const size = new TextEncoder().encode(content).byteLength
      if (size > (isSource ? MAX_CODE_FILE_BYTES : MAX_FILE_BYTES) || size > remaining) continue
      if (isSource && sanitizeEvidenceText(content).findings.length > 0) continue
      totalBytes += size
      if (isSource) {
        totalCodeBytes += size
        codeFileCount += 1
      }
      files.push({ path, content })
    }
    return { trackedPaths, files }
  } catch {
    throw new GithubRepositoryInspectionError(failureCategory)
  } finally {
    if (temporaryDirectory?.startsWith(`${temporaryParent.replace(/\/$/, '')}/github-inspect.`)) {
      try {
        await runner.run('rm', ['-rf', temporaryDirectory], 4_096)
      } catch {
        // The caller only receives the sanitized inspection result; cleanup errors never expose paths.
      }
    }
  }
}
