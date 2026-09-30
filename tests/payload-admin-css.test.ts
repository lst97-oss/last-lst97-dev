import { describe, expect, test } from 'bun:test'

const ROOTS = ['node_modules/@payloadcms/ui/dist', 'node_modules/@payloadcms/richtext-lexical/dist'] as const

/** Mirrors scripts/generate-payload-admin-css.ts; a Payload bump that moves CSS elsewhere must update both. */
const SKIPPED: Record<string, true> = {
  'node_modules/@payloadcms/ui/dist/styles.css': true,
  'node_modules/@payloadcms/ui/dist/css/app.css': true,
}

const GENERATED = 'src/styles/payload-admin-generated.css'
const THEME = 'src/styles/payload-admin-theme.css'

const REQUIRED = [
  'node_modules/@payloadcms/ui/dist/templates/Default/index.css',
  'node_modules/@payloadcms/ui/dist/elements/Nav/index.css',
  'node_modules/@payloadcms/ui/dist/elements/Nav/SidebarTabs/index.css',
  'node_modules/@payloadcms/ui/dist/views/List/index.css',
  'node_modules/@payloadcms/ui/dist/widgets/CollectionCards/index.css',
  'node_modules/@payloadcms/richtext-lexical/dist/field/index.css',
]

async function importTargets(): Promise<string[]> {
  const text = await Bun.file(GENERATED).text()
  return [...text.matchAll(/^@import '(?<specifier>[^']+)';$/gm)].map((match) =>
    match.groups?.specifier ??
    '',
  )
}

async function collectPackageCss(): Promise<string[]> {
  const glob = new Bun.Glob('**/*.css')
  const paths: string[] = []
  for (const root of ROOTS) {
    for await (const entry of glob.scan({ cwd: root })) {
      const absolute = `${root}/${entry}`
      if (absolute.includes('/node_modules/')) continue
      if (SKIPPED[absolute]) continue
      paths.push(absolute)
    }
  }
  return paths
}

describe('payload admin generated stylesheet', () => {
  test('imports exactly the deduplicated package stylesheet set', async () => {
    const expected = await collectPackageCss()
    const seen = new Set<string>()
    const unique: string[] = []
    for (const path of expected.sort((a, b) => (a < b ? -1 : 1))) {
      const hash = new Bun.CryptoHasher('sha256')
      hash.update(new Uint8Array(await Bun.file(path).arrayBuffer()))
      const digest = hash.digest('hex')
      if (seen.has(digest)) continue
      seen.add(digest)
      unique.push(path)
    }

    expect(new Set(await importTargets())).toEqual(new Set(unique.map((path) => `../../${path}`)))
  })

  test('imports the stylesheets the admin layout depends on', async () => {
    const targets = await importTargets()
    for (const required of REQUIRED) {
      expect(targets).toContain(`../../${required}`)
    }
  })
})

describe('payload admin theme', () => {
  test('pins the admin font families to the platform stack', async () => {
    const theme = await Bun.file(THEME).text()
    const declarations = [...theme.matchAll(/--font-family-(?<kind>sans|mono):(?<value>[^;]+);/g)]
    const values = Object.fromEntries(
      declarations.map((match) => [match.groups?.kind, (match.groups?.value ?? '').trim()]),
    )

    expect(Object.keys(values).sort()).toEqual(['mono', 'sans'])
    for (const value of Object.values(values)) {
      expect(value).not.toBe('Inter')
      expect(value).not.toBe('Roboto Mono')
      expect(value).not.toContain('Inter')
    }
    expect(values.sans).toContain('-apple-system')
    expect(values.mono).toContain('ui-monospace')
  })
})
