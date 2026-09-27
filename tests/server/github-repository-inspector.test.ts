import { describe, expect, it } from 'bun:test'

import { inspectGithubRepository, type GithubCommandRunner } from '../../src/server/knowledge/github/repository-inspector'

describe('GitHub repository inspector', () => {
  it('uses a temporary shallow clone, reads only allowlisted files, and cleans up', async () => {
    const calls: string[][] = []
    const runner: GithubCommandRunner = {
      async run(command, args) {
        calls.push([command, ...args])
        if (command === 'mktemp') return '/tmp/github-inspect.abc\n'
        if (command === 'gh') return ''
        if (command === 'git' && args.includes('ls-tree')) {
          return [
            'README.md', 'package.json', 'src/index.ts', 'tests/index.test.ts',
            '.env', 'secrets/token.txt', 'node_modules/pkg/index.js', 'dist/app.js',
            'assets/logo.png', 'server.key', 'debug.log',
          ].join('\n')
        }
        if (command === 'git' && args.includes('show')) {
          const path = args.at(-1)?.replace('HEAD:', '')
          if (path === 'README.md') return '# Demo\nA safe project description.'
          if (path === 'package.json') return '{"name":"demo"}'
          if (path === 'src/index.ts') return 'export function startDemo() { return true }'
          if (path === 'tests/index.test.ts') return "test('starts the demo service', () => {})"
          return ''
        }
        return ''
      },
    }
    const snapshot = await inspectGithubRepository({ fullName: 'someone/demo', url: 'https://github.com/someone/demo', isPrivate: false }, '/tmp', runner)

    expect(calls.find(([command]) => command === 'gh')).toEqual([
      'gh', 'repo', 'clone', 'someone/demo', '/tmp/github-inspect.abc', '--',
      '--depth', '1', '--filter=blob:none', '--no-checkout',
    ])
    expect(snapshot.trackedPaths).toContain('src/index.ts')
    expect(snapshot.files.map((file) => file.path)).toEqual(['README.md', 'package.json', 'src/index.ts', 'tests/index.test.ts'])
    expect(calls.filter(([command, ...args]) => command === 'git' && args.includes('show')).map(([, ...args]) => args.at(-1))).toEqual([
      'HEAD:README.md', 'HEAD:package.json', 'HEAD:src/index.ts', 'HEAD:tests/index.test.ts',
    ])
    expect(calls.at(-1)).toEqual(['rm', '-rf', '/tmp/github-inspect.abc'])
  })

  it('cleans temporary storage when a tracked file read fails', async () => {
    const calls: string[][] = []
    const runner: GithubCommandRunner = {
      async run(command, args) {
        calls.push([command, ...args])
        if (command === 'mktemp') return '/tmp/github-inspect.fail\n'
        if (command === 'git' && args.includes('ls-tree')) return 'README.md'
        if (command === 'git' && args.includes('show')) throw new Error('sensitive path content')
        return ''
      },
    }

    await expect(inspectGithubRepository({ fullName: 'someone/demo', url: 'https://github.com/someone/demo', isPrivate: true }, '/tmp', runner)).rejects.toThrow('Repository inspection failed')
    expect(calls.at(-1)).toEqual(['rm', '-rf', '/tmp/github-inspect.fail'])
  })

  it('returns an empty but valid snapshot for an empty GitHub repository', async () => {
    const runner: GithubCommandRunner = {
      async run(command, args) {
        if (command === 'mktemp') return '/tmp/github-inspect.empty\n'
        if (command === 'git' && args.includes('ls-tree')) throw new Error('empty tree')
        if (command === 'git' && args.includes('rev-parse')) throw new Error('no commit yet')
        return ''
      },
    }

    await expect(inspectGithubRepository({ fullName: 'someone/empty', url: 'https://github.com/someone/empty', isPrivate: false }, '/tmp', runner))
      .resolves.toEqual({ trackedPaths: [], files: [] })
  })

  it('prioritizes application source over benchmark and test files within the inspection cap', async () => {
    const trackedPaths = [
      ...Array.from({ length: 105 }, (_, index) => `benches/${String(index).padStart(3, '0')}.rs`),
      'src/main.rs',
      'tests/main_test.rs',
    ]
    const readPaths: string[] = []
    const runner: GithubCommandRunner = {
      async run(command, args) {
        if (command === 'mktemp') return '/tmp/github-inspect.priority\n'
        if (command === 'git' && args.includes('ls-tree')) return trackedPaths.join('\0')
        if (command === 'git' && args.includes('show')) {
          const path = args.at(-1)?.replace('HEAD:', '') ?? ''
          readPaths.push(path)
          return 'pub fn main() {}'
        }
        return ''
      },
    }

    const snapshot = await inspectGithubRepository({
      fullName: 'someone/demo', url: 'https://github.com/someone/demo', isPrivate: false,
    }, '/tmp', runner)

    expect(snapshot.files.map(({ path }) => path)).toContain('src/main.rs')
    expect(readPaths).not.toContain('benches/000.rs')
  })
})
