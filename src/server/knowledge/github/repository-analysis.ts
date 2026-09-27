import type { ProjectSoftwareKind } from '../project-catalog'
import type { GithubRepositorySnapshot } from './repository-inspector'

export interface GithubRepositoryAnalysisTarget {
  fullName: string
  url: string
  isPrivate: boolean
  ownerProvidedPurpose?: string
  description?: string | null
  topics?: string[]
  languages?: Array<{ name: string; bytes: number }>
  defaultBranch?: string | null
  updatedAt?: string | null
  primaryLanguage?: string | null
  license?: string | null
  homepage?: string | null
  createdAt?: string | null
  stars?: number
  forks?: number
  softwareKinds?: ProjectSoftwareKind[]
  curatedTopics?: string[]
}

export interface GithubEvidenceFact {
  value: string
  evidence: string[]
  inferred: boolean
  origin?: 'owner-provided'
}

export interface GithubRepositoryAnalysis {
  repository: GithubRepositoryAnalysisTarget
  purpose: GithubEvidenceFact
  problem: GithubEvidenceFact
  features: GithubEvidenceFact[]
  files: { total: number; source: number; tests: number; docs: number; configuration: number; assetsAndOther: number }
  technology: Array<{ name: string; evidence: string[] }>
  patterns: Array<{ name: string; evidence: string[]; inferred: boolean }>
  structure: { directories: Array<{ name: string; files: number }>; representativeFiles: string[] }
  inspectedSourceFileCount: number
  implementationEvidence: GithubEvidenceFact[]
  limitations: string[]
}

const stackPatterns: Array<{ name: string; regex: RegExp }> = [
  { name: 'TypeScript', regex: /"typescript"\s*:/i },
  { name: 'React', regex: /"react"\s*:/i },
  { name: 'TanStack Router', regex: /"@tanstack\/react-router"\s*:/i },
  { name: 'TanStack Start', regex: /"@tanstack\/react-start"\s*:/i },
  { name: 'Vite', regex: /"vite"\s*:/i },
  { name: 'Next.js', regex: /"next"\s*:/i },
  { name: 'FastAPI', regex: /fastapi\s*[=<>~]/i },
  { name: 'Python', regex: /\[project\]|python_requires|requires-python/i },
  { name: 'Rust', regex: /\[package\]/i },
  { name: 'Go', regex: /^module\s+\S+/m },
  { name: 'PostgreSQL', regex: /postgres(?:ql)?/i },
  { name: 'Bun', regex: /"bun"\s*:/i },
  { name: 'Tailwind CSS', regex: /"tailwindcss"\s*:/i },
]

function countFiles(paths: string[]): GithubRepositoryAnalysis['files'] {
  const counts = { total: paths.length, source: 0, tests: 0, docs: 0, configuration: 0, assetsAndOther: 0 }
  for (const path of paths) {
    const lower = path.toLowerCase()
    const base = lower.split('/').at(-1) ?? ''
    if (/\.(test|spec)\.[^.]+$/.test(lower) || /(^|\/)(tests?|__tests__|spec)(\/|$)/.test(lower)) counts.tests += 1
    else if (/\.(md|mdx|rst|txt)$/.test(lower)) counts.docs += 1
    else if (
      /\.(json|ya?ml|toml|ini|conf|config|lock)$/.test(lower) ||
      /config\.[a-z0-9]+$/.test(base) ||
      /(^|\/)(dockerfile|makefile|justfile)$/.test(base)
    )
      counts.configuration += 1
    else if (
      /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|kt|swift|cs|php|rb|ex|exs|dart|vue|svelte|html|css|scss)$/.test(lower)
    )
      counts.source += 1
    else counts.assetsAndOther += 1
  }
  return counts
}

function isAuxiliarySourcePath(path: string): boolean {
  return (
    /(^|\/)(?:tests?|__tests__|spec|benches?|benchmarks?|examples?|fixtures?|snapshots?|docs?)(\/|$)/i.test(path) ||
    /(^|\/)scripts\/(?:test|bench|benchmark|quality_check|example)[^/]*\.[^.]+$/i.test(path)
  )
}

function isCoreSourcePath(path: string): boolean {
  return /^(?:src|app|server|lib|pages|packages|cmd|internal|crates)\//i.test(path) || !path.includes('/')
}

function splitIdentifier(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
}

function describeExportedSymbol(name: string, kind: 'function' | 'type' | 'component'): string | undefined {
  const words = splitIdentifier(name)
  if (words.length === 0) return undefined
  const normalized = words.map((word) => word.toLowerCase())
  const first = normalized.at(0) ?? ''
  const actionVerbs: Record<string, string> = {
    add: 'Adds',
    align: 'Aligns',
    analyze: 'Analyzes',
    authenticate: 'Authenticates',
    build: 'Builds',
    calculate: 'Calculates',
    cancel: 'Cancels',
    chat: 'Chats with',
    classify: 'Classifies',
    clear: 'Clears',
    close: 'Closes',
    connect: 'Connects',
    convert: 'Converts',
    create: 'Creates',
    delete: 'Deletes',
    detect: 'Detects',
    download: 'Downloads',
    embed: 'Embeds',
    execute: 'Executes',
    export: 'Exports',
    fetch: 'Fetches',
    filter: 'Filters',
    find: 'Finds',
    format: 'Formats',
    generate: 'Generates',
    get: 'Gets',
    import: 'Imports',
    handle: 'Handles',
    index: 'Indexes',
    initialize: 'Initializes',
    load: 'Loads',
    login: 'Signs in to',
    logout: 'Signs out of',
    manage: 'Manages',
    moderate: 'Moderates',
    open: 'Opens',
    parse: 'Parses',
    process: 'Processes',
    publish: 'Publishes',
    rank: 'Ranks',
    read: 'Reads',
    query: 'Queries',
    recommend: 'Recommends',
    remove: 'Removes',
    render: 'Renders',
    rerank: 'Reranks',
    respond: 'Responds to',
    retrieve: 'Retrieves',
    run: 'Runs',
    save: 'Saves',
    search: 'Searches',
    send: 'Sends',
    serialize: 'Serializes',
    start: 'Starts',
    stop: 'Stops',
    submit: 'Submits',
    sync: 'Synchronizes',
    transcribe: 'Transcribes',
    update: 'Updates',
    upload: 'Uploads',
    validate: 'Validates',
    verify: 'Verifies',
    write: 'Writes',
  }
  if (actionVerbs[first] && normalized.length > 1) return `${actionVerbs[first]} ${normalized.slice(1).join(' ')}`
  const readableName = words.join(' ')
  if (kind === 'component' || /(?:Page|View|Screen|Panel|Card|Form|Dialog|Modal|Widget)$/.test(name))
    return `Provides the ${readableName} UI component`
  if (kind === 'type') return `Defines the ${readableName} type or service`
  return undefined
}

function inspectSource(snapshot: GithubRepositorySnapshot): {
  purpose: GithubEvidenceFact
  features: GithubEvidenceFact[]
  implementationEvidence: GithubEvidenceFact[]
  sourceFileCount: number
} {
  const semanticRules: Array<{ name: string; regex: RegExp }> = [
    { name: 'Reads runtime environment variables', regex: /\b(?:process\.env|Bun\.env|Deno\.env|getenv\s*\()/ },
    {
      name: 'Validates structured input or configuration',
      regex: /\b(?:safeParse|parseAsync|validate(?:Sync|Async)?\s*\()/,
    },
    {
      name: 'Calls external HTTP services',
      regex: /\bfetch\s*\(|\baxios\.(?:get|post|put|delete)\s*\(|\bhttps?\.request\s*\(/,
    },
    {
      name: 'Persists or queries application data',
      regex:
        /\b(?:prisma\.\w+\.(?:findMany|findUnique|create|update|delete|upsert)|(?:pool|db|database|client)\.(?:query|execute)\s*\(|sqlx::query|diesel::|\b(?:SELECT|INSERT INTO|UPDATE\s+\w+|DELETE FROM)\b[\s\S]{0,160}\bFROM\b)\b/i,
    },
    {
      name: 'Implements authentication',
      regex:
        /\b(?:bcrypt|argon2|jsonwebtoken|passport-jwt|oauth2?\b|jose\b|jwt\.(?:sign|verify)|jwt_(?:encode|decode))\b/i,
    },
    {
      name: 'Uses a distributed or explicit cache',
      regex: /\b(?:redis::|RedisClient|ioredis|memoize\s*\(|lru_cache|cache\.(?:get|set|delete)\s*\()/i,
    },
    {
      name: 'Implements AI or language-model features',
      regex: /\b(?:openrouter|openai|anthropic|llm|whisper|qwen\d?|llama|from_pretrained|tokenizer|rerank)\b/i,
    },
    { name: 'Sends email through an email transport', regex: /\b(?:nodemailer|sendMail|smtp)\b/i },
    { name: 'Integrates a headless CMS', regex: /\b(?:payloadcms|payload\.find|strapi|sanity\.io|contentful)\b/i },
    {
      name: 'Implements command-line behavior',
      regex: /\b(?:process\.argv|Bun\.argv|commander|yargs|clap::|argparse|structopt)\b/,
    },
    {
      name: 'Renders a React user interface',
      regex: /\b(?:from\s+['"]react['"]|useState\s*\(|useEffect\s*\(|createRoot\s*\()/,
    },
  ]
  const readableCodeFiles = snapshot.files.filter(
    ({ path }) =>
      isSourceEvidencePath(path) &&
      !/(^|\/)(?:public|assets?|static|vendor)(\/|$)/i.test(path) &&
      !isAuxiliarySourcePath(path),
  )
  const coreCodeFiles = readableCodeFiles.filter(({ path }) => isCoreSourcePath(path))
  const sourceFiles = coreCodeFiles.length
    ? coreCodeFiles
    : readableCodeFiles.filter(({ path }) => !/(^|\/)scripts\//i.test(path))
  const productFiles = sourceFiles.length ? sourceFiles : readableCodeFiles
  const semanticEvidence: GithubEvidenceFact[] = []
  for (const rule of semanticRules) {
    const evidence = productFiles
      .filter(({ content }) => rule.regex.test(content))
      .map(({ path }) => path)
      .slice(0, 5)
    if (evidence.length) semanticEvidence.push({ value: rule.name, evidence, inferred: true })
  }
  const httpHandlerFiles = productFiles.filter(({ content }) =>
    /\b(?:router|app|server)\.(?:get|post|put|patch|delete|route)\s*\(|\bexport\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/.test(
      content,
    ),
  )
  if (httpHandlerFiles.length) {
    semanticEvidence.push({
      value: 'Defines HTTP request handlers',
      evidence: httpHandlerFiles.map(({ path }) => path).slice(0, 8),
      inferred: true,
    })
  }
  const environmentImplementation = productFiles.filter(
    ({ path, content }) =>
      /(?:^|\/)(?:config|environment|env)(?:\/|\.|$)/i.test(path) &&
      /\b(?:process\.env|Bun\.env|Deno\.env)\b/.test(content),
  )
  if (
    environmentImplementation.length &&
    /\b(?:zod|valibot|joi|yup)\b/i.test(environmentImplementation.map(({ content }) => content).join('\n'))
  ) {
    semanticEvidence.push({
      value: 'Validates and types runtime environment configuration',
      evidence: environmentImplementation.map(({ path }) => path).slice(0, 5),
      inferred: true,
    })
  }
  const schemaValidationFiles = productFiles.filter(
    ({ content }) =>
      /\b(?:zod|valibot|joi|yup|BaseModel)\b/i.test(content) &&
      /\b(?:safeParse|parseAsync|\.parse\s*\(|\.validate\s*\()/i.test(content),
  )
  if (
    schemaValidationFiles.length &&
    environmentImplementation.length === 0 &&
    !semanticEvidence.some(({ value }) => value === 'Validates structured input or configuration')
  ) {
    semanticEvidence.push({
      value: 'Validates structured data with schema definitions',
      evidence: schemaValidationFiles.map(({ path }) => path).slice(0, 5),
      inferred: true,
    })
  }
  const uiSource = productFiles.filter(
    ({ path, content }) => /\.(?:tsx|jsx|vue|svelte)$/i.test(path) && /<[A-Za-z]/.test(content),
  )
  if (uiSource.length && !semanticEvidence.some(({ value }) => value === 'Renders a React user interface')) {
    semanticEvidence.push({
      value: 'Defines component-based user-interface views',
      evidence: uiSource.map(({ path }) => path).slice(0, 5),
      inferred: true,
    })
  }
  const exportedSymbols: GithubEvidenceFact[] = []
  const seenSymbols = new Set<string>()
  const symbolPatterns: Array<{ regex: RegExp; kind: 'function' | 'type' | 'component' }> = [
    { regex: /^\s*export\s+(?:(?:async|default)\s+)*function\s+([A-Za-z_$][\w$]*)/gm, kind: 'function' },
    {
      regex:
        /^\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|(?:\([^\n)]*\)|[A-Za-z_$][\w$]*)\s*=>)/gm,
      kind: 'function',
    },
    {
      regex: /^\s*export\s+(?:(?:default|abstract)\s+)*(?:class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
      kind: 'type',
    },
    { regex: /^\s*(?:export\s+)?(?:async\s+)?def\s+([A-Za-z_]\w*)/gm, kind: 'function' },
    { regex: /^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)/gm, kind: 'type' },
    { regex: /^\s*pub\s+(?:async\s+)?fn\s+([A-Za-z_]\w*)/gm, kind: 'function' },
    { regex: /^\s*pub\s+(?:struct|enum|trait)\s+([A-Za-z_]\w*)/gm, kind: 'type' },
    { regex: /^\s*func\s+([A-Z][A-Za-z0-9_]*)\s*\(/gm, kind: 'function' },
    { regex: /^\s*type\s+([A-Z][A-Za-z0-9_]*)\s+(?:struct|interface)\b/gm, kind: 'type' },
    {
      regex: /^\s*public\s+(?:(?:static|abstract|sealed|final)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/gm,
      kind: 'type',
    },
  ]
  for (const file of productFiles) {
    for (const { regex, kind } of symbolPatterns) {
      for (const match of file.content.matchAll(regex)) {
        const name = match[1]
        if (!name || seenSymbols.has(`${kind}:${name}`)) continue
        seenSymbols.add(`${kind}:${name}`)
        const isUiFile = /\.(?:tsx|jsx|vue|svelte)$/i.test(file.path)
        const description = describeExportedSymbol(name, isUiFile ? 'component' : kind)
        if (description) exportedSymbols.push({ value: description, evidence: [file.path], inferred: true })
        if (exportedSymbols.length >= 32) break
      }
      if (exportedSymbols.length >= 32) break
    }
    if (exportedSymbols.length >= 32) break
  }

  const implementationEvidence = [...semanticEvidence]
  const routes = inspectImplementation({ trackedPaths: snapshot.trackedPaths, files: productFiles }).filter(
    ({ value }) => / route: \/api\//.test(value),
  )
  for (const route of routes) {
    if (!implementationEvidence.some(({ value }) => value === route.value)) implementationEvidence.push(route)
  }
  for (const symbol of exportedSymbols) {
    if (!implementationEvidence.some(({ value }) => value === symbol.value)) implementationEvidence.push(symbol)
  }
  const testEvidence = inspectImplementation(snapshot).filter(({ evidence }) =>
    evidence.some((path) => /(?:test|spec)/i.test(path)),
  )
  for (const item of testEvidence) {
    const tested = { ...item, value: `Tested behavior: ${item.value}` }
    if (!implementationEvidence.some(({ value }) => value === tested.value)) implementationEvidence.push(tested)
  }
  const features = implementationEvidence.slice(0, 24)
  const purposeParts = [
    ...semanticEvidence.map(({ value }) => value.toLowerCase()),
    ...exportedSymbols
      .filter(({ value }) =>
        /^(?:Adds|Aligns|Analyzes|Authenticates|Builds|Calculates|Cancels|Chats|Classifies|Clears|Closes|Connects|Converts|Creates|Deletes|Detects|Downloads|Embeds|Executes|Exports|Fetches|Filters|Finds|Formats|Generates|Gets|Imports|Indexes|Initializes|Loads|Manages|Moderates|Opens|Parses|Processes|Publishes|Queries|Recommends|Removes|Renders|Reranks|Responds|Retrieves|Runs|Saves|Searches|Sends|Serializes|Starts|Stops|Submits|Synchronizes|Transcribes|Updates|Uploads|Validates|Verifies|Writes)\b/.test(
          value,
        ),
      )
      .slice(0, 4)
      .map(({ value }) => value.toLowerCase()),
    ...routes.slice(0, 2).map(({ value }) => value.toLowerCase()),
  ].slice(0, 5)
  const purpose = purposeParts.length
    ? {
        value: `Source implementation indicates these responsibilities: ${purposeParts.join('; ')}.`,
        evidence: [
          ...new Set(
            [...semanticEvidence, ...exportedSymbols, ...routes].slice(0, 8).flatMap(({ evidence }) => evidence),
          ),
        ],
        inferred: true,
      }
    : {
        value: 'Unknown: the inspected source does not expose enough named behavior to identify the project purpose.',
        evidence: [],
        inferred: false,
      }
  return { purpose, features, implementationEvidence: features, sourceFileCount: productFiles.length }
}

function isSourceEvidencePath(path: string): boolean {
  return /\.(?:ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|kt|swift|cs|php|rb|ex|exs|dart|vue|svelte|html|css|scss)$/i.test(
    path,
  )
}

function inspectImplementation(snapshot: GithubRepositorySnapshot): GithubRepositoryAnalysis['implementationEvidence'] {
  const evidence: GithubRepositoryAnalysis['implementationEvidence'] = []
  for (const file of snapshot.files) {
    if (!/\.(?:test|spec)\.[^.]+$/i.test(file.path) && !/(^|\/)(?:tests?|__tests__|spec)(\/|$)/i.test(file.path))
      continue
    const titlePattern = /(?:test|it)\s*\(\s*(['"])([^'"\n]{3,160})\1/g
    for (const match of file.content.matchAll(titlePattern)) {
      const title = match[2]?.trim()
      if (title) evidence.push({ value: title, evidence: [file.path], inferred: true })
      if (evidence.length >= 16) return evidence
    }
  }
  for (const file of snapshot.files) {
    if (!isSourceEvidencePath(file.path)) continue
    const routePattern = /\b([A-Za-z_$][\w$]*(?:route|path|endpoint))\s*[:=]\s*['"](\/[^'"\s]{1,120})['"]/gi
    for (const match of file.content.matchAll(routePattern)) {
      if (!match[2]?.startsWith('/api/')) continue
      const rawLabel =
        (match[1] ?? 'API')
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/route|path|endpoint/i, '')
          .trim() || 'API'
      const label = rawLabel.replace(/^\w/, (character) => character.toUpperCase())
      evidence.push({ value: `${label} route: ${match[2]}`, evidence: [file.path], inferred: true })
      if (evidence.length >= 24) return evidence
    }
  }
  return evidence
}

export function analyzeGithubRepository(
  snapshot: GithubRepositorySnapshot,
  repository: GithubRepositoryAnalysisTarget,
): GithubRepositoryAnalysis {
  const fileCounts = countFiles(snapshot.trackedPaths)
  const docs = snapshot.files.find(({ path }) => /^README(?:\.(?:md|mdx|txt))?$/i.test(path))
  const sourceFacts = inspectSource(snapshot)
  const facts = {
    purpose: repository.ownerProvidedPurpose?.trim()
      ? {
          value: repository.ownerProvidedPurpose.trim(),
          evidence: [],
          inferred: false,
          origin: 'owner-provided' as const,
        }
      : sourceFacts.purpose,
    problem: {
      value: 'Unknown: source code does not explicitly state the problem addressed.',
      evidence: [],
      inferred: false,
    },
    features: sourceFacts.features,
  }
  const technology: GithubRepositoryAnalysis['technology'] = []
  for (const pattern of stackPatterns) {
    const evidence = snapshot.files
      .filter(({ path, content }) => !/^README(?:\.|$)/i.test(path) && pattern.regex.test(content))
      .map(({ path }) => path)
    if (evidence.length) technology.push({ name: pattern.name, evidence })
  }
  const codeLanguages: Array<{ name: string; regex: RegExp }> = [
    { name: 'TypeScript', regex: /\.(?:ts|tsx)$/i },
    { name: 'JavaScript', regex: /\.(?:js|jsx|mjs|cjs)$/i },
    { name: 'Python', regex: /\.py$/i },
    { name: 'Rust', regex: /\.rs$/i },
    { name: 'Go', regex: /\.go$/i },
    { name: 'Java', regex: /\.java$/i },
    { name: 'Kotlin', regex: /\.kt$/i },
    { name: 'Swift', regex: /\.swift$/i },
    { name: 'C#', regex: /\.cs$/i },
    { name: 'PHP', regex: /\.php$/i },
    { name: 'Ruby', regex: /\.rb$/i },
    { name: 'Elixir', regex: /\.exs?$/i },
    { name: 'Dart', regex: /\.dart$/i },
  ]
  for (const language of codeLanguages) {
    if (technology.some(({ name }) => name === language.name)) continue
    const evidence = snapshot.trackedPaths.filter((path) => language.regex.test(path)).slice(0, 8)
    if (evidence.length) technology.push({ name: language.name, evidence })
  }
  const paths = snapshot.trackedPaths
  const directoryCounts = new Map<string, number>()
  for (const path of paths) {
    const root = path.split('/')[0]
    if (path.includes('/')) directoryCounts.set(root, (directoryCounts.get(root) ?? 0) + 1)
  }
  const structure = {
    directories: [...directoryCounts]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 20)
      .map(([name, files]) => ({ name, files })),
    representativeFiles: snapshot.files
      .filter(({ path }) => isSourceEvidencePath(path))
      .map(({ path }) => path)
      .slice(0, 20),
  }
  const patterns: GithubRepositoryAnalysis['patterns'] = []
  for (const [name, dirs] of [
    ['domain-driven design', ['domain/']],
    ['layered architecture', ['domain/', 'application/', 'infrastructure/']],
    ['ports and adapters', ['ports/', 'adapters/']],
    ['hexagonal architecture', ['domain/', 'application/', 'infrastructure/', 'ports/', 'adapters/']],
    ['test-driven development evidence', ['tests/', '__tests__/', 'test/']],
  ] as const) {
    const evidence = dirs.flatMap((dir) =>
      paths.filter((path) => path.toLowerCase().split('/').includes(dir.replace(/\/$/, ''))).slice(0, 3),
    )
    const requirement = name === 'layered architecture' ? dirs.length : name === 'hexagonal architecture' ? 3 : 1
    if (evidence.length >= requirement) patterns.push({ name, evidence, inferred: true })
  }
  const limitations = []
  if (!docs) limitations.push('README is unavailable; source-based findings do not depend on it.')
  if (!facts.features.length)
    limitations.push('No behavior-bearing exports or test descriptions were found in the inspected source files.')
  if (!technology.length) limitations.push('No supported language, framework, or stack manifest evidence was found.')
  if (!patterns.length)
    limitations.push('No supported architecture-pattern evidence was found; no pattern is asserted.')
  if (!structure.representativeFiles.length)
    limitations.push('No source files were available for representative module inspection.')
  return {
    repository,
    ...facts,
    files: fileCounts,
    technology,
    patterns,
    structure,
    inspectedSourceFileCount: sourceFacts.sourceFileCount,
    implementationEvidence: sourceFacts.implementationEvidence,
    limitations,
  }
}
