import { describe, expect, it } from 'bun:test'

import { analyzeGithubRepository } from '../../src/server/knowledge/github/repository-analysis'
import type { GithubRepositorySnapshot } from '../../src/server/knowledge/github/repository-inspector'

const metadata = {
  fullName: 'lst97/demo',
  url: 'https://github.com/lst97/demo',
  isPrivate: false,
  description: 'A demo tool',
}

describe('GitHub repository analysis', () => {
  it('reports file counts and evidence-backed stack and architecture hints', () => {
    const snapshot: GithubRepositorySnapshot = {
      trackedPaths: [
        'README.md',
        'package.json',
        'src/app.tsx',
        'tests/app.test.tsx',
        'docs/guide.md',
        'config/vite.config.ts',
      ],
      files: [
        {
          path: 'README.md',
          content: '# Demo\n\nA tool to make task tracking simpler.\n\n## Features\n- Search tasks\n- Export reports',
        },
        {
          path: 'package.json',
          content:
            '{"dependencies":{"react":"^19","@tanstack/react-router":"^1"},"devDependencies":{"vite":"^8","typescript":"^5"}}',
        },
        { path: 'src/app.tsx', content: 'export function searchTasks() {}\nexport function exportReports() {}' },
        { path: 'tests/app.test.tsx', content: "test('filters tasks by status', () => {})" },
      ],
    }
    const analysis = analyzeGithubRepository(snapshot, metadata)

    expect(analysis.purpose.value.toLowerCase()).toContain('searches tasks')
    expect(analysis.purpose.value).not.toContain('task tracking simpler')
    expect(analysis.problem.value).toBe('Unknown: source code does not explicitly state the problem addressed.')
    expect(analysis.features.map(({ value }) => value)).toEqual([
      'Searches tasks',
      'Exports reports',
      'Tested behavior: filters tasks by status',
    ])
    expect(analysis.files).toEqual({ total: 6, source: 1, tests: 1, docs: 2, configuration: 2, assetsAndOther: 0 })
    expect(analysis.technology.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['React', 'TanStack Router', 'Vite', 'TypeScript']),
    )
    expect(analysis.patterns.some(({ name, inferred }) => name === 'layered architecture' && inferred)).toBe(false)
  })

  it('uses explicit unknowns when the repository has no useful evidence', () => {
    const analysis = analyzeGithubRepository(
      { trackedPaths: ['main.bin'], files: [] },
      {
        fullName: 'someone/empty',
        url: 'https://github.com/someone/empty',
        isPrivate: true,
        description: null,
      },
    )

    expect(analysis.purpose.value).toBe(
      'Unknown: the inspected source does not expose enough named behavior to identify the project purpose.',
    )
    expect(analysis.features).toEqual([])
    expect(analysis.technology).toEqual([])
    expect(analysis.patterns).toEqual([])
    expect(analysis.files.total).toBe(1)
  })

  it('detects Python/FastAPI evidence and only infers a layered pattern with matching paths', () => {
    const analysis = analyzeGithubRepository(
      {
        trackedPaths: [
          'README.md',
          'pyproject.toml',
          'src/domain/model.py',
          'src/application/service.py',
          'src/infrastructure/store.py',
          'tests/test_api.py',
        ],
        files: [
          { path: 'README.md', content: '# Service\n\nA service for organizing notes.' },
          { path: 'pyproject.toml', content: '[project]\ndependencies = ["fastapi>=0.100"]' },
        ],
      },
      {
        fullName: 'community/service',
        url: 'https://github.com/community/service',
        isPrivate: false,
        description: null,
      },
    )

    expect(analysis.technology.map(({ name }) => name)).toContain('FastAPI')
    expect(analysis.technology.map(({ name }) => name)).toContain('Python')
    expect(analysis.patterns).toContainEqual(expect.objectContaining({ name: 'layered architecture', inferred: true }))
  })

  it('uses cloned source and test content to report modules and implementation-backed behavior', () => {
    const analysis = analyzeGithubRepository(
      {
        trackedPaths: ['README.md', 'src/api/contact.ts', 'src/domain/message.ts', 'tests/contact.test.ts'],
        files: [
          { path: 'README.md', content: '# Inbox Guard\n\nA service for protecting inbound messages.' },
          {
            path: 'src/api/contact.ts',
            content: "export const contactRoute = '/api/contact';\nexport async function submitContact() {}",
          },
          {
            path: 'src/domain/message.ts',
            content: 'export class MessagePolicy {}\nexport function validateMessage() {}',
          },
          {
            path: 'tests/contact.test.ts',
            content: "test('rejects a message when verification is missing', () => {})",
          },
        ],
      },
      metadata,
    )

    expect(analysis.structure.directories).toContainEqual({ name: 'src', files: 2 })
    expect(analysis.structure.representativeFiles).toContain('src/domain/message.ts')
    expect(analysis.implementationEvidence).toContainEqual({
      value: 'Tested behavior: rejects a message when verification is missing',
      evidence: ['tests/contact.test.ts'],
      inferred: true,
    })
    expect(analysis.implementationEvidence).toContainEqual({
      value: 'Contact route: /api/contact',
      evidence: ['src/api/contact.ts'],
      inferred: true,
    })
    expect(analysis.features.map(({ value }) => value)).toContain('Validates message')
    expect(analysis.purpose.evidence).toContain('src/domain/message.ts')
  })

  it('does not mislabel an image asset path as an application route', () => {
    const analysis = analyzeGithubRepository(
      {
        trackedPaths: ['README.md', 'src/about.ts'],
        files: [
          { path: 'README.md', content: '# Site\n\nA personal website.' },
          { path: 'src/about.ts', content: "export const backgroundImagePath = '/pixel-art-calendar.png'" },
        ],
      },
      metadata,
    )

    expect(analysis.implementationEvidence).toEqual([])
  })

  it('derives an environment-service purpose from runtime implementation rather than a stale README', () => {
    const analysis = analyzeGithubRepository(
      {
        trackedPaths: ['README.md', 'package.json', 'src/config/env.ts'],
        files: [
          { path: 'README.md', content: '# Old React shop\n\nAn outdated commerce application.' },
          { path: 'package.json', content: '{"dependencies":{"zod":"^4"}}' },
          {
            path: 'src/config/env.ts',
            content:
              "import { z } from 'zod'\nconst envSchema = z.object({ API_URL: z.string().url() })\nexport const getEnv = () => envSchema.parse(process.env)",
          },
        ],
      },
      metadata,
    )

    expect(analysis.purpose.value).toContain('runtime environment configuration')
    expect(analysis.purpose.value).not.toContain('commerce application')
    expect(analysis.features.map(({ value }) => value)).toContain('Reads runtime environment variables')
    expect(analysis.features.map(({ value }) => value)).toContain(
      'Validates and types runtime environment configuration',
    )
    expect(analysis.features.every(({ evidence }) => evidence.some((path) => path.startsWith('src/')))).toBe(true)
  })

  it('uses only explicit owner context for SplitTab purpose while deriving features and stack from the clone', () => {
    const analysis = analyzeGithubRepository(
      {
        trackedPaths: ['README.md', 'package.json', 'src/expenses/group.ts', 'tests/expenses/group.test.ts'],
        files: [
          { path: 'README.md', content: '# Personal blog\n\nA blog for publishing recipes.' },
          { path: 'package.json', content: '{"dependencies":{"typescript":"^5"}}' },
          { path: 'src/expenses/group.ts', content: 'export function createExpenseGroup() {}' },
          {
            path: 'tests/expenses/group.test.ts',
            content: "test('splits shared expenses between participants', () => {})",
          },
        ],
      },
      {
        fullName: 'lst97/SplitTab',
        url: 'https://github.com/lst97/SplitTab',
        isPrivate: false,
        ownerProvidedPurpose: 'Expense-management app for splitting shared costs.',
      },
    )

    expect(analysis.purpose).toMatchObject({
      value: 'Expense-management app for splitting shared costs.',
      evidence: [],
      inferred: false,
      origin: 'owner-provided',
    })
    expect(analysis.features.map(({ value }) => value)).toContain('Creates expense group')
    expect(analysis.features.map(({ value }) => value)).toContain(
      'Tested behavior: splits shared expenses between participants',
    )
    expect(analysis.technology.map(({ name }) => name)).toContain('TypeScript')
    expect(analysis.purpose.value).not.toContain('blog')
    expect(analysis.features.join(' ')).not.toContain('publishing recipes')
  })

  it('does not infer authentication or persistence from model sessions, cache names, or benchmark code', () => {
    const analysis = analyzeGithubRepository(
      {
        trackedPaths: ['README.md', 'src/models/kv_cache.rs', 'benches/e2e_bench.rs', 'scripts/test-variants.py'],
        files: [
          { path: 'README.md', content: '# Model runtime\n\nA model runtime.' },
          { path: 'src/models/kv_cache.rs', content: 'pub struct KVCache { session_cache: HashMap<u32, Vec<u8>> }' },
          { path: 'benches/e2e_bench.rs', content: 'let session = model.run();' },
          { path: 'scripts/test-variants.py', content: 'test_case = "database session auth"' },
        ],
      },
      metadata,
    )

    expect(analysis.implementationEvidence.map(({ value }) => value)).not.toContain(
      'Implements authentication or session handling',
    )
    expect(
      analysis.implementationEvidence.every(({ evidence }) =>
        evidence.every((path) => !path.startsWith('benches/') && !path.startsWith('scripts/test-')),
      ),
    ).toBe(true)
  })
})
