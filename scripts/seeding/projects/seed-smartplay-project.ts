/**
 * Seeds the SmartPlay HK OSS project, its topics, and its tags.
 *
 * Sibling to `seed-gnaf-project.ts` and deliberately identical in shape:
 * the Payload local API, a Markdown literal converted with
 * `convertMarkdownToLexical`, and slug-keyed upserts so repeated runs never
 * accumulate duplicates. Anything that changes structurally between the two
 * scripts should change in both.
 *
 * The ASCII-art blocks in the original write-up are Mermaid flowcharts here.
 * ` ```mermaid ` fences become Lexical `Code` blocks tagged
 * `language: 'mermaid'`, which is exactly what `src/components/site/content/rich-text.tsx`
 * keys on to render a diagram instead of a code listing — and what
 * `src/collections/fields/content-editor.ts` adds to the admin's language select.
 *
 * Idempotent: matched by slug and updated in place; topics and tags upsert by slug.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the Zeabur endpoint that URL
 * needs `?sslmode=no-verify`: the certificate is self-signed.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const PROJECT_SLUG = 'smartplay-hk-oss'

const TOPICS = [
  {
    slug: 'external-integrations',
    title: 'External Integrations',
    description: 'Owning an upstream third-party API: contract boundaries, failure modes, and honest timeouts.',
  },
  {
    slug: 'background-processing',
    title: 'Background Processing',
    description: 'Scheduled jobs, bounded queues, retries, dead letters, and record that outlives a request.',
  },
  {
    slug: 'data-engineering',
    title: 'Data Engineering',
    description: 'Bulk ingestion, normalisation, deduplication, and repeatable dataset refreshes.',
  },
] as const

const TAGS = [
  { slug: 'open-source', title: 'Open Source', description: 'Self-hostable and reusable by anyone.' },
  {
    slug: 'reliability',
    title: 'Reliability',
    description: 'Retries, circuit breaking, and recovery from partial failure.',
  },
  { slug: 'webhooks', title: 'Webhooks', description: 'Outbound notifications when external conditions change.' },
  {
    slug: 'internationalisation',
    title: 'Internationalisation',
    description: 'Shipping an interface in more than one language.',
  },
  {
    slug: 'observability',
    title: 'Observability',
    description: 'Operational questions answered from persisted state, not guesswork.',
  },
] as const

/**
 * The original write-up drew the component map as a boxed ASCII diagram. The node
 * order and labels are preserved, so the figure says the same thing in a form the
 * content renderer actually draws.
 */
const ARCHITECTURE_DIAGRAM = `flowchart TB
  user["USER"] --> ui["REACT INTERFACE"]
  ui --> start["TANSTACK START"]
  start --> booking["BOOKING SERVICES"]
  start --> watch["WATCH SERVICES"]
  booking --> prisma["PRISMA"]
  watch --> prisma
  prisma --> pg[("POSTGRESQL")]
  pg --> crawl["CRAWLER PIPELINE"]
  crawl --> orchestrator["ORCHESTRATOR"]
  orchestrator --> queue["SCHEDULER / RETRY / DLQ"]
  queue --> http["HTTP CLIENT"]
  http --> lcsd["LCSD SMARTPLAY API"]`

/** The crawler as a single linear path: schedule in, local rows out. */
const CRAWLER_PIPELINE_DIAGRAM = `flowchart TB
  cron["CRON SCHEDULER"] --> run["SCHEDULED CRAWL RUN"]
  run --> tasks["CONCURRENCY QUEUE"]
  tasks --> request["HTTP CLIENT"]
  request --> lcsd["LCSD SMARTPLAY"]
  lcsd --> validate["VALIDATION"]
  validate --> normalise["NORMALISATION"]
  normalise --> repo["PRISMA REPOSITORY"]
  repo --> pg[("POSTGRESQL")]`

/**
 * Retry, dead-letter, and circuit-breaker behaviour in one picture. The three
 * together are the point: retries handle isolated failures, the DLQ keeps the
 * failures that outlive them, and the breaker stops retrying when the whole
 * upstream is gone.
 */
const RESILIENCE_DIAGRAM = `flowchart TB
  request["UPSTREAM REQUEST"] --> classify{"CLASSIFY FAILURE"}
  classify -->|"retryable"| backoff["BACKOFF + JITTER"]
  backoff --> request
  classify -->|"exhausted"| dlq[("DEAD LETTER QUEUE")]
  classify -->|"permanent"| drop["LOG AND DROP"]
  repeated{"FAILURE THRESHOLD REACHED?"}
  repeated -->|"yes"| breaker["CIRCUIT OPENS"]
  breaker --> cooldown["COOLDOWN"]
  cooldown --> halfopen["HALF-OPEN PROBE"]
  halfopen -->|"success"| closed["CLOSED"]
  halfopen -->|"failure"| breaker
  request -.-> repeated`

const MARKDOWN = `## The problem

Hong Kong's Leisure and Cultural Services Department publishes sports facility availability through the SmartPLAY system, but finding an available session means navigating the official interface by hand.

The data underneath is also unstable. Sessions open and close constantly as people book, cancel, and release courts, so the useful question is never "what facilities exist" — it is "what is free, where, and when".

Proxying the LCSD API on every request would have been the quickest version of this. It also couples the product directly to a third-party government service: response times become their latency, every visitor generates duplicate upstream load, and an outage on their side becomes an outage on this one.

So the application keeps its own representation instead:

\`\`\`mermaid
${CRAWLER_PIPELINE_DIAGRAM}
\`\`\`

Users are served from PostgreSQL. The crawler absorbs the unreliability.

## What it delivers

An open-source full-stack application for discovering sports facility availability across Hong Kong: scheduled background crawling, availability search filtered by date, district, centre, venue, and facility type, and availability watchers that notify when a session opens.

It also ships webhook delivery in generic, Discord, and Slack formats, English / Traditional Chinese / Simplified Chinese interfaces, anonymous browser sessions instead of accounts, persistent crawl and retry history, and Docker-based deployment with CI/CD.

The visible product is a search interface. The engineering underneath it is the part worth describing.

## Architecture

One deployment, clear boundaries: TanStack Start hosting the React frontend and server functions, TanStack server functions bridging into services, services owning Prisma, Prisma owning PostgreSQL. The crawler is a separate workload sharing that database.

\`\`\`mermaid
${ARCHITECTURE_DIAGRAM}
\`\`\`

This is deliberately a modular monolith. The crawler, watchers, web UI, and API have different responsibilities, but nothing demonstrated that they needed separate deployments — and splitting them would have bought service discovery, distributed tracing, and inter-service failure modes in exchange.

## Designing for an unreliable upstream

The single largest engineering investment in this project was treating the LCSD API as something that will eventually fail, because it eventually does.

Every upstream request sits behind a timeout, a classified retry policy, and a bounded concurrency queue. Timeouts, connection failures, 5xx, and parse failures retry with exponential backoff and jitter; 404 and other 4xx responses are treated as permanent, because retrying a request the upstream has already rejected as invalid only adds load.

Retries cannot run forever, so persistent failures land in a database-backed dead letter queue recording the facility, district, date, error type, HTTP status, attempt count, first and latest failure times, and next retry time. That turns "something failed last night" into a query.

Above both sits a circuit breaker. When LCSD starts failing consistently, continuing to issue requests only wastes application resources and lengthens queues, so the breaker opens, waits out a cooldown, then permits a limited half-open probe before deciding whether to close again.

\`\`\`mermaid
${RESILIENCE_DIAGRAM}
\`\`\`

## Bounded concurrency, not maximum concurrency

The crawler could launch hundreds of requests at once. A bounded \`p-queue\` means it processes several in parallel without ever bursting against SmartPLAY.

The external service is a dependency this project does not control, so protecting it is part of protecting itself.

Concurrency and request timing are configurable through environment variables rather than hard-coded, and the crawl schedule runs through \`node-cron\` with its own persisted state.

A scheduled run creates individual crawl jobs that are tracked separately, so a multi-day refresh is visible as a set of tracked jobs instead of one opaque process.

## Turning an external contract into a domain model

SmartPLAY responses nest periods, districts, venues, facilities, and sessions in a shape that is convenient for SmartPLAY and wrong for everything downstream.

Zod validates the boundary and the crawler normalises it into District, Facility, FacilityType, Session, and CrawlJob rows before storage. After that boundary, the frontend never needs to understand the upstream format — which is what let the UI and the crawler evolve independently.

The database then owns the correctness rules that application code should not have to enforce alone. Sessions carry a composite uniqueness constraint across venue, facility, date, and start time, so repeated crawls update one stable row instead of accumulating duplicates — enforced at the persistence layer, where concurrent writes cannot bypass it.

Indexes follow the actual query shape the booking interface asks: venue + date, date + available, date + facility, and available + verification time.

Availability counts are pre-aggregated into an \`AvailabilityStats\` representation across date, district, centre, and facility, so the UI never recomputes counts from every raw session row on a page request.

## Availability watchers

A user who cannot find a free session should not have to keep refreshing. A watcher records venue, facility, date, start time, and end time; the crawler refreshes availability; an evaluator compares the observed state and emits a watch hit when it changes.

The notification service delivers that hit as a generic webhook, a Discord payload, or a Slack payload. Notification outcomes are recorded rather than discarded, so a failed delivery is observable instead of silently lost.

Watcher creation is treated as the server-side, abuse-prone operation it is and is protected with Cloudflare Turnstile, alongside security headers and a Content Security Policy configured so Turnstile works without broadly weakening browser security.

## Anonymous sessions instead of accounts

Watchers need ownership, but ownership does not require identity. A full registration and password system was not justified by the feature, so the application issues an anonymous browser session that owns a user's watchers and settings, and every ownership check is enforced against that session identifier.

A real authentication system can be added later if a feature genuinely requires persistent user identity. Until then it would only be complexity.

## Internationalisation

Hong Kong is not an English-only audience, so localisation is a feature rather than a translation pass at the end.

The application ships English, Traditional Chinese, and Simplified Chinese through \`i18next\` and \`react-i18next\`, with resources split by namespace, loaded lazily, and converted between Chinese variants where appropriate.

## Lifecycle and observability

A crawler produces continuously changing data, so retention is part of the design rather than an afterthought. Cleanup processes remove expired sessions, expired watchers, stale watcher hits, orphaned user settings, dead-letter rows already resolved, and abandoned anonymous browser sessions.

Operating questions are answered from persisted state through Pino structured logging plus crawl job records: did the crawler run, which date failed, which facility fails repeatedly, was the failure retryable, did the webhook delivery succeed. Without those records the same questions require guessing at logs.

## Tech stack

- **Frontend:** React 19, TanStack Start, TanStack Router, TanStack Query, TanStack Form, Tailwind CSS, Base UI, Lucide
- **Backend:** TanStack Start server functions, Node.js, Zod, Pino, node-cron, p-queue
- **Database:** PostgreSQL with Prisma ORM
- **Internationalisation:** i18next, react-i18next, chinese-conv
- **Security:** Cloudflare Turnstile, Content Security Policy, CodeQL
- **Quality:** Vitest, Testing Library, Biome, TypeScript
- **Infrastructure:** Docker, Docker Compose, GitHub Container Registry, GitHub Actions, Cloudflare Tunnel, Tailscale

## Testing and CI/CD

Tests cover crawler operations, scheduler recovery, retry behaviour, session cleanup, utilities, and React components, using a mock crawler repository so the suite never depends on the real SmartPLAY service being up. A government API outage should not be able to turn the build red.

GitHub Actions runs install, Prisma client generation, Biome, TypeScript, and tests before building and publishing an image to GHCR; production deploys only after both quality checks and the image build succeed.

Deployment reaches a private server over Tailscale rather than exposing SSH publicly, pulls the new image, recreates the containers, and finishes with a health check. CodeQL scans pushes to \`main\`, pull requests, and a weekly schedule.

## What this project demonstrates

The interesting part of SmartPlay HK OSS is not the availability interface — it is the decision to assume the external system will fail, and to answer that with timeout, retry, backoff, jitter, bounded concurrency, circuit breaking, partial-failure recovery, deduplication, observability, and cleanup.

The other lesson was separating the external contract from the internal domain model. SmartPLAY's response format is useful for SmartPLAY and never needed to become the architecture of this application — validating and normalising at the boundary is what let everything downstream work in models that represent the product's own domain.
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

  const topicIds = await upsertVocabulary(payload, 'topics', TOPICS)
  const tagIds = await upsertVocabulary(payload, 'tags', TAGS)

  const data = {
    slug: PROJECT_SLUG,
    title: 'SmartPlay HK OSS',
    summary:
      'An open-source full-stack application that crawls Hong Kong LCSD SmartPLAY facility availability into PostgreSQL and serves date-, district-, and venue-filtered search with availability watchers and webhook notifications.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'completed' as const,
    startDate: '2026-01-17T00:00:00.000Z',
    endDate: '2026-08-20T00:00:00.000Z',
    repositoryUrl: 'https://github.com/lst97/smartplay-hk-oss',
    liveUrl: 'https://sphkoss.lst97.dev',
    // Not featured: the home carousel is taken by the featured window at -2, -1,
    // 0 and 1. This sits directly below the portfolio overview at 7, so the
    // archive reads overview, then the individual project articles.
    featured: false,
    sortOrder: 8,
    status: 'published' as const,
    // `technologies` is a Payload array field, so each entry is a row object
    // with a `technology` key rather than a bare string.
    technologies: [
      'TypeScript',
      'React 19',
      'TanStack Start',
      'TanStack Router',
      'TanStack Query',
      'Node.js',
      'Prisma',
      'PostgreSQL',
      'Zod',
      'Pino',
      'i18next',
      'Docker',
      'GitHub Actions',
      'Cloudflare Turnstile',
      'Cloudflare Tunnel',
      'Tailscale',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'SmartPlay HK OSS',
      description:
        'An open-source Hong Kong sports facility availability system: a resilient SmartPLAY crawler with retries, a dead letter queue, and circuit breaking, plus availability search, watchers, and webhook notifications.',
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
