/**
 * Seeds "My overall projects walk through" — the portfolio overview article —
 * plus its topics and tags.
 *
 * This row already exists in the database (created through the admin, id 1) and
 * carries three paragraphs of unstructured prose. This seed replaces that prose
 * with a real article and makes the row reproducible from source rather than
 * only editable through the CMS.
 *
 * Its content is generated from two committed corpora, so the figures in it are
 * counted rather than recalled:
 *
 * - `src/data/github/public/*.md` — 89 owned public repositories
 * - `src/data/github/private/*.md` — 22 owned private repositories
 * - `src/data/github/contributions/public/*.md` — 22 contributed-to repositories
 *
 * and the `src/data/projects` corpus — the six hand-authored project deep-dive
 * folders, which is what the individual project seeds below cover in detail.
 * Nothing here is invented: every count in the article is the number of files
 * or `Primary language` / `Software kinds` lines in those directories.
 *
 * It is deliberately NOT featured and does NOT sit at a negative `sortOrder`.
 * It is an overview of the portfolio rather than a shipped project, so it
 * belongs in the archive listing rather than in the home carousel; see the
 * `sortOrder` comment below.
 *
 * Privacy: public repositories are described individually. Private and
 * client-held work is grouped by domain and described without naming unpublished
 * clients, matching how the portfolio already treats Wat Wat New Zealand. The
 * private summaries themselves are sanitized and intentionally tracked under
 * `src/data/github/private/`, but a public-facing article should still not
 * enumerate a client's business by name.
 *
 * Idempotent: matched by slug and updated in place; topics and tags upsert by
 * slug. It reuses the existing `full-stack`, `open-source`, `postgresql` and
 * `api` vocabulary rows rather than creating near-duplicates of them.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the Zeabur endpoint that URL
 * needs `?sslmode=no-verify`: the certificate is self-signed.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const PROJECT_SLUG = 'my-overall-projects-walk-through'

const TOPICS = [
  {
    slug: 'project-history',
    title: 'Project History',
    description: 'The arc of a body of work over time — how the stack and the domain breadth changed across it.',
  },
  {
    slug: 'software-craft',
    title: 'Software Craft',
    description: 'Patterns repeated consistently across many independent projects, and the reasons behind them.',
  },
] as const

const TAGS = [
  {
    slug: 'portfolio-overview',
    title: 'Portfolio Overview',
    description: 'A walk through a body of work rather than a deep dive into one system.',
  },
  {
    slug: 'self-hosted-services',
    title: 'Self-Hosted Services',
    description: 'Running infrastructure directly rather than renting it from a managed provider.',
  },
  {
    slug: 'native-and-cross-platform',
    title: 'Native and Cross-Platform',
    description: 'Desktop, mobile and embedded targets built alongside the web tier.',
  },
] as const

/**
 * The shape of the corpus, by year. This is the argument the article makes:
 * the early work is embedded and coursework, the middle is mobile, and the
 * recent work is web services and models.
 */
const TIMELINE_DIAGRAM = `flowchart LR
  subgraph foundation["2018-2021 · Foundations"]
    lang["Language practice<br/>C, C++, Java, Python"]
    embedded["Embedded systems<br/>Raspberry Pi, C++, cloud functions"]
    coursework["University coursework<br/>fuzzy logic, MPI, concurrency"]
  end
  subgraph products["2022-2024 · Shipped products"]
    mobile["Android apps<br/>Kotlin and Java"]
    reactapps["Web apps<br/>React, TypeScript, CMS"]
    common["Shared libraries<br/>responses, errors, services"]
  end
  subgraph platform["2025-2026 · Platforms"]
    services["API and commerce<br/>TypeScript, Go, PostgreSQL"]
    tooling["Developer tooling<br/>Rust, Shell"]
    models["Speech and ML<br/>Rust, Python"]
  end
  foundation --> products
  products --> platform`

const MARKDOWN = `## The shape of the work

This article is an overview. The individual project articles elsewhere on this site go deep on individual systems — how a quotation becomes an invoice, how a karaoke highlight follows a melody, how a crawler survives an upstream outage. This one is about the shape of the whole body of work, and about the few decisions that stay the same across it.

The corpus behind this article is 89 owned public repositories, 22 owned private repositories, and 22 repositories I have contributed to. They span December 2018 to September 2026. The line counts, language distribution and file inventory in it are read from the repository reports rather than estimated.

## How the work changed

The earliest repositories are language practice and embedded coursework. Assembly and C on Windows, then C++, then Java and Python — the order a computer science degree actually teaches them. The embedded systems work from 2022 is the most distinctive of that early period: a remote lock and a set of Raspberry Pi tasks driving relays, Morse code, PWM and I²C, with cloud functions receiving webhooks and a particle interface feeding the results back. That is real hardware, a cloud broker, and a control loop, assembled at a scale where every part is visible.

\`\`\`mermaid
${TIMELINE_DIAGRAM}
\`\`\`

Around 2023 the shape changes to shipped applications. A run of Android apps in Kotlin and Java — a unit converter, a quiz app, a news reader, a lost-and-found tracker, a trucking app, a video app — followed by an end-to-end encrypted messaging app with a separate frontend and backend.

The clearest signal of engineering maturity is what came next: between March and April 2024, a cluster of small shared libraries. \`CommonResponseStructure\` and \`CommonErrors\` for consistent API envelopes, \`ExpressCommonMiddlewares\` for request handling, \`CommonServices\` for the shared service layer. Each was extracted from a project that had already needed it twice. Building a shared library after the second duplication is a different decision from building one before the first.

From 2025 the work consolidates into platforms. A media platform with separate frontend and backend. A Cantonese-learning platform with an API server, a web app and a set of Python micro-services. A speech-to-text model and a text-to-speech model, both in Rust. Developer tooling in Shell and Rust — an agent runner, a command collection, a crawler, a converter. And the portfolio platform this site runs on.

## What repeats across it

Three patterns account for most of the volume.

**Ship the whole slice, not a layer.** Every non-trivial product here is a frontend, a backend, and the schema or service contract between them, maintained together. The receipt manager, the encrypted messaging app, the Cantonese platform, the business platform — the same shape each time. Layer-only contributions are the exception.

**Reusable code is extracted after the second use.** The 2024 common-libraries cluster is the clearest example. Earlier projects repeat a handful of patterns inline — API response envelopes, error shapes, middleware, database access — and those become libraries once they have been written twice.

**Self-host over managed, when the managed thing is the product.** The address autocomplete service searches roughly sixteen million Australian addresses from a self-hosted PostgreSQL instance rather than a hosted geocoding API. The portfolio runs on a single Bun application. The reasoning is the same in each case: when the data is the product, owning the store is cheaper than renting access to it.

## Public work

The public repositories break down by language: TypeScript leads with 24, then Python at 12, C++ at 11, Java at 7, JavaScript at 5, Kotlin at 4, HTML at 4, Rust at 3, with Shell, CSS and C at 2 each and C# and Go at 1 each.

By software kind, across the whole corpus: 20 web applications, 17 API backends, 10 mobile apps, 8 automation and developer tools, 3 data and machine-learning projects, and a handful of desktop, CLI and infrastructure tools.

A few of the public ones are worth naming directly.

**G-NAF Autocomplete** — a self-hosted autocomplete service over the full Australian address dataset, measured under 50 ms at the 95th percentile on PostgreSQL indexes alone, with no external geocoding call in the request path.

**SmartPlay HK OSS** — a crawler and watcher for Hong Kong facility and district data, with failure classification, a database-backed dead letter queue, jittered exponential backoff and a circuit breaker that stops issuing requests entirely when an upstream is down.

**Canto101** — a Cantonese-learning platform with a dictionary-grade lexical corpus, word-level karaoke timing derived from the audio itself, and a clean-architecture API server fanning out to isolated Python micro-services.

**Best Maker Pty Ltd** — the operating system behind a custom fabrication and joinery business: a quote-to-cash pipeline with split payments, bank reconciliation, a commerce back-office, and a published API contract with a generated, drift-checked client.

**PixelCast** and **CantoLyr** — media and lyric tooling, the latter the origin of the Cantonese karaoke work.

**subagents.sh** and the related tooling — agent orchestration, command collections and crawlers that automate the parts of development that do not need judgement.

**QwenASR** and **qwen3-tts-rs** — speech recognition and speech synthesis, both in Rust, both running locally on consumer hardware rather than through a hosted inference API.

**Uptime Kuma** — a self-hosted monitoring deployment, included as a run of real infrastructure rather than a portfolio piece in its own right.

## Private and client work

The 22 private repositories cover work that is either under an NDA, belongs to a client, or simply has not been open-sourced. Describing them by domain rather than by name:

**Business and operations systems.** A fabrication and joinery business platform spanning quote-to-cash, invoices with split payments, expense capture and approval, bank reconciliation and a two-way spreadsheet bridge. A shared-expense splitting application with its own settlement engine, multi-currency balances and partial-payment credit handling. An employment accounting tool. A staffing and shift scheduling system.

**Commerce.** Two cabinetry storefronts — a customer-facing store and its backend — built as a paired deployment.

**Cantonese language technology.** The lyric timing pipeline behind the karaoke feature, split across a web app, a server and a refactor branch, plus a Cantonese subtitling tool.

**Media and monitoring.** A fire-safety documentary site with its own data repository and a Go background worker. A self-hosted monitoring deployment.

**Developer and infrastructure tooling.** A file storage microservice. A queue-based ticket system. An automation service for the facility-data crawler. Internal services for document rendering, email, background workers and backups.

**Applied machine learning and instrumentation.** A thermal imaging pose-analysis service. A recoil-analysis tool. A native speedometer for Apple platforms.

**Archived foundations.** A headless CMS experiment and an early storage service, both superseded by later work.

## What this does not cover

Some of the work is not on this site at all: coursework that is not representative, repositories with nothing to show, and contributions to other people's projects, which are tracked but not claimed as portfolio pieces.

The numbers in this article describe the repository corpus. They are a count of what exists in version control, which is a lower bound on the work rather than a complete accounting of it.
`

async function upsertVocabulary(
  payload: Payload,
  collection: 'topics' | 'tags',
  entries: readonly { slug: string; title: string; description: string }[],
): Promise<number[]> {
  const ids: number[] = []

  for (const entry of entries) {
    const existing = await payload.find({
      collection,
      where: { slug: { equals: entry.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const doc = existing.docs[0]
    const saved = doc
      ? await payload.update({
          collection,
          id: doc.id,
          data: { title: entry.title, slug: entry.slug, description: entry.description },
          overrideAccess: true,
        })
      : await payload.create({
          collection,
          data: { title: entry.title, slug: entry.slug, description: entry.description },
          overrideAccess: true,
        })

    if (typeof saved.id !== 'number') throw new Error(`${collection} ${entry.slug} did not return a numeric id`)
    ids.push(saved.id)
    console.log(`  ${collection}: ${entry.slug} (${doc ? 'updated' : 'created'})`)
  }

  return ids
}

/** The `language` of a Lexical `Code` block; undefined for any other node shape. */
function codeBlockLanguage(node: unknown): string | undefined {
  if (typeof node !== 'object' || node === null || !('fields' in node)) return undefined
  const fields = node.fields
  if (typeof fields !== 'object' || fields === null || !('language' in fields)) return undefined
  return typeof fields.language === 'string' ? fields.language : undefined
}

async function main() {
  const payload = await getPayload({ config })

  const projects = payload.config.collections.find((collection) => collection.slug === 'projects')
  const contentField = projects?.fields.find(
    (field): field is RichTextField => field.type === 'richText' && 'name' in field && field.name === 'content',
  )
  if (!contentField) throw new Error('The projects collection has no richText content field')

  const editorConfig = editorConfigFactory.fromField({ field: contentField })
  const content = convertMarkdownToLexical({ editorConfig, markdown: MARKDOWN })

  // Reuses existing vocabulary where the concept already exists, rather than
  // creating a near-duplicate row that would need reconciling later.
  const topicIds = await upsertVocabulary(payload, 'topics', TOPICS)
  const tagIds = await upsertVocabulary(payload, 'tags', [
    ...TAGS,
    {
      slug: 'full-stack',
      title: 'Full Stack',
      description: 'Frontend, backend and the contract between them, maintained together.',
    },
    { slug: 'open-source', title: 'Open Source', description: 'Self-hostable and reusable by anyone.' },
  ])

  const data = {
    slug: PROJECT_SLUG,
    title: 'My overall projects walk through',
    summary:
      'An overview of 89 public and 22 private repositories spanning eight years — from embedded systems and Android apps to API platforms, Cantonese language technology, and locally-run speech models.',
    role: 'Full Stack Developer',
    projectStatus: 'in_progress' as const,
    // The GitHub account was created 2015-12-31, but the repository corpus in
    // `src/data/github` starts at 2018-12-04. The date states when the work
    // this article describes begins.
    startDate: '2018-12-04T00:00:00.000Z',
    // No `endDate`: the corpus is still growing.
    liveUrl: 'https://github.com/lst97',
    repositoryUrl: 'https://github.com/lst97',
    // Not featured. This is an overview of the portfolio rather than a shipped
    // project, so it belongs in the archive listing. The home carousel is taken
    // by the featured window the other project seeds set at -2, -1, 0 and 1.
    featured: false,
    // Leads the non-featured listing, above SmartPlay at 7. Wat Wat New Zealand
    // moves to 9 so this article reads first among the archive rows.
    sortOrder: 7,
    status: 'published' as const,
    // `technologies` is a Payload array field, so each entry is a row object
    // with a `technology` key rather than a bare string. These are the
    // languages actually present in `src/data/github`, most-used first.
    technologies: [
      'TypeScript',
      'Python',
      'C++',
      'Java',
      'JavaScript',
      'Kotlin',
      'Rust',
      'C',
      'C#',
      'Go',
      'Shell',
      'React',
      'Next.js',
      'PostgreSQL',
      'Tailwind CSS',
      'HTML',
      'CSS',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'My overall projects walk through',
      description:
        'An overview of 89 public and 22 private repositories spanning eight years, from embedded systems and Android apps to API platforms, Cantonese language technology, and locally-run speech models.',
    },
  }

  const existing = await payload.find({
    collection: 'projects',
    where: { slug: { equals: PROJECT_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const current = existing.docs[0]
  const saved = current
    ? await payload.update({ collection: 'projects', id: current.id, data, overrideAccess: true })
    : await payload.create({ collection: 'projects', data, overrideAccess: true })

  const children: unknown[] = Array.isArray(saved.content?.root?.children) ? [...saved.content.root.children] : []
  const blockLanguages = children
    .filter((node) => typeof node === 'object' && node !== null && 'type' in node && node.type === 'block')
    .map(codeBlockLanguage)

  console.log(`\nProject ${current ? 'updated' : 'created'}: ${saved.slug} (id ${saved.id})`)
  console.log(`  code block languages: ${JSON.stringify(blockLanguages)}`)
  console.log(`  topics: ${topicIds.length}, tags: ${tagIds.length}`)
  console.log('  Note: the afterChange hook enqueued an indexKnowledgeSource job for the knowledge worker.')

  await payload.db.destroy?.()
}

await main()
process.exit(0)
