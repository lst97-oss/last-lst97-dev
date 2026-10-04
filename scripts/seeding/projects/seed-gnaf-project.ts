/**
 * Seeds the G-NAF Address Autocomplete project, its topics, and its tags.
 *
 * Uses the Payload local API rather than raw SQL. `scripts/seed-demo-content.ts`
 * has to write raw `pg` statements because `payload.find()` used to fail on
 * `projects` — Payload built a lateral join against a missing polymorphic
 * `projects_rels` table. That table now exists, so the collection hooks, the
 * version row, and the publication date all apply here.
 *
 * The article body is built from Markdown with `convertMarkdownToLexical`, the
 * same conversion the admin's Markdown mode performs. That matters for the
 * architecture diagram: a ` ```mermaid ` fence becomes a `Code` block tagged
 * `language: 'mermaid'`, which is exactly what the rich-text converter keys on
 * to render a flowchart instead of a code listing.
 *
 * Idempotent: the project is matched by slug and updated in place, and every
 * topic and tag is upserted by slug, so repeated runs never accumulate
 * duplicates.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the Zeabur endpoint that URL
 * needs `?sslmode=no-verify`: the certificate is self-signed, so plain
 * `sslmode=require` fails with "self-signed certificate" and omitting it fails
 * with "no pg_hba.conf entry ... no encryption".
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const PROJECT_SLUG = 'gnaf-address-autocomplete'

const TOPICS = [
  {
    slug: 'search-infrastructure',
    title: 'Search Infrastructure',
    description: 'Query routing, tiered indexes, and caching behind an autocomplete endpoint.',
  },
  {
    slug: 'data-engineering',
    title: 'Data Engineering',
    description: 'Bulk ingestion, denormalisation, and repeatable dataset refreshes.',
  },
  {
    slug: 'postgresql',
    title: 'PostgreSQL',
    description: 'PostgreSQL used directly as the search engine, without a separate cluster.',
  },
] as const

const TAGS = [
  { slug: 'autocomplete', title: 'Autocomplete', description: 'Type-ahead search interfaces.' },
  { slug: 'geocoding', title: 'Geocoding', description: 'Turning an address into coordinates, and back.' },
  { slug: 'open-source', title: 'Open Source', description: 'Self-hostable and reusable by anyone.' },
  { slug: 'api', title: 'API', description: 'A documented, versioned HTTP surface.' },
  { slug: 'performance', title: 'Performance', description: 'Measured latency budgets and benchmarks.' },
] as const

/**
 * The architecture diagram as `flowchart TB`. The original write-up drew this
 * as a boxed ASCII diagram; the node order and labels are preserved so the
 * figure says the same thing, now rendered by the shared Mermaid component the
 * chat pipeline uses.
 */
const ARCHITECTURE_DIAGRAM = `flowchart TB
  client["Client"] --> api["BUN / ELYSIA API"]
  api --> auth["API KEY AUTH"]
  api --> parser["QUERY PARSER"]
  api --> cache["LRU CACHE"]
  parser --> classifier["QUERY CLASSIFIER"]
  classifier --> router["SEARCH TIER ROUTER"]
  router --> postgres["POSTGRESQL"]
  postgres --> btree["B-TREE INDEXES"]
  postgres --> gin["GIN TRIGRAM INDEXES"]
  btree --> view["MATERIALIZED SEARCH VIEW"]
  gin --> view
  ingest["DATA INGESTION"] --> view
  gnaf["GEOSCAPE G-NAF"] --> ingest`

const MARKDOWN = `## The problem

Address autocomplete looks simple from the frontend: a user types a few characters and receives suggestions. The difficult part is everything behind that input.

The service has to search millions of records while people are still typing, which means a useful implementation needs low-latency responses, useful results from incomplete input, and street/locality/postcode/state-aware queries.

It also needs typo tolerance, predictable performance, protection against API abuse, simple deployment, repeatable dataset updates, and observability when something goes wrong.

A commercial provider solves much of that infrastructure problem, but introduces recurring cost, external dependencies, rate limits, and vendor lock-in.

This project deliberately went the other way: one self-contained service owning the complete search path from raw G-NAF data to the API response.

## What it delivers

Search across approximately **16 million Australian addresses**, autocomplete while the user types, street/suburb/postcode/state-aware queries, typo correction, and detailed lookup by G-NAF identifier.

On top of that it adds domain-bound API keys, per-key rate limiting, in-process query caching, health and readiness endpoints, OpenAPI 3.1 documentation, an interactive test interface, and public aggregated usage analytics.

Operationally there is automated data ingestion, repeatable quarterly dataset refreshes, Docker-based deployment, CI/CD, benchmark tooling, and unit and integration tests.

## Architecture

The core architecture is deliberately small. Elasticsearch, OpenSearch, Redis, Kafka, and a microservice split were all considered and rejected: PostgreSQL plus a lightweight API process were sufficient.

\`\`\`mermaid
${ARCHITECTURE_DIAGRAM}
\`\`\`

Only two application-critical services exist: the API and PostgreSQL. That keeps deployment and operational complexity low while still allowing the search workload to be heavily optimised.

## PostgreSQL as the search engine

One of the major engineering decisions was to use PostgreSQL itself as the search engine.

The raw G-NAF dataset is relational and highly structured, so rather than immediately adding a dedicated search cluster, the required latency was investigated using specialised PostgreSQL indexes first.

The result is a materialized search representation with multiple indexes optimised for different query shapes. Instead of forcing every request through one generic full-text search query, the application decides what the user appears to be searching for and selects an appropriate strategy:

| Query pattern | Search strategy |
| --- | --- |
| Street prefix | B-tree prefix index |
| State + locality | Composite B-tree index |
| State + postcode | Composite B-tree index |
| Postcode prefix | B-tree prefix index |
| Incomplete/fuzzy street | Trigram GIN |
| Multi-word fallback | Trigram search |
| Corrected typo | Correction to indexed prefix search |

That multi-tier query router matters because autocomplete workloads are highly uneven. A request such as \`syd nsw\` has very different characteristics from \`12 main st sydney\` or \`3000\`. Treating them identically wastes work.

## Performance

Performance was treated as a measurable requirement rather than a subjective goal, with a target of **p95 under 50 ms** for uncached autocomplete requests.

A benchmark of 1,000 mixed query shapes against the complete dataset, with the application-level suggestion cache disabled so the results represented the search path rather than cache hits, measured:

| Metric | Result |
| --- | ---: |
| p50 | ~7 ms |
| p95 | ~26 ms |
| p99 | ~28 ms |
| Average | ~10 ms |
| Repeated cached query | <1 ms |

The benchmark environment used a MacBook Pro with an M5 Pro and PostgreSQL running through Docker, so these numbers should be read as measurements from that environment rather than as universal infrastructure guarantees.

The important outcome is that the target was achievable using PostgreSQL without introducing another search platform.

## Loading 16 million addresses

Serving the data efficiently was only half the problem; the dataset also had to be loaded and refreshed without impractical time or memory cost.

G-NAF PSV files are pre-processed, then nine parallel state and territory workers stream rows into PostgreSQL staging tables with \`COPY FROM STDIN\`.

Rather than building huge JavaScript arrays and performing bulk \`INSERT\` operations, rows stream directly into PostgreSQL and application memory stays predictable.

\`\`\`mermaid
flowchart TB
  psv["G-NAF PSV FILES"] --> prep["PRE-PROCESSING"]
  prep --> workers["9 PARALLEL STATE/TERRITORY WORKERS"]
  workers --> copy["COPY FROM STDIN"]
  copy --> staging["POSTGRESQL STAGING TABLES"]
  staging --> denorm["DENORMALISATION"]
  denorm --> view["MATERIALIZED SEARCH VIEW"]
  view --> indexes["PARALLEL INDEX CREATION"]
  indexes --> warm["INDEX WARM-UP"]
\`\`\`

On the development hardware the complete dataset loads and is ready in roughly **9 to 10 minutes**.

## Search quality

Fast results are not useful if users have to type an address perfectly. The search pipeline normalises input and corrects common street, locality, and state mistakes before selecting the database query.

Where possible, corrected input is routed back into the fast indexed search paths rather than sent to an expensive fuzzy search, which preserves both search quality and latency.

## API design

The service exposes a small HTTP API rather than coupling the search engine to a particular frontend:

\`\`\`plaintext
GET /suggest
GET /address/:id
GET /healthz
GET /readyz
GET /openapi.json
GET /api/stats
\`\`\`

A typical autocomplete request carries the query and an API key:

\`\`\`plaintext
GET /suggest?q=12+main+st+sydney
X-API-Key: <key>
\`\`\`

and returns structured suggestions carrying a display string, locality, state, postcode, and coordinates. That keeps the backend independent of whichever React, mobile, or other client consumes it.

## API keys and abuse protection

Autocomplete endpoints are called continuously while a user types, so an exposed public endpoint can generate significant traffic. Keys can be associated with authorised domains and are stored using cryptographic hashes rather than raw tokens.

The controls are:

- Per-key rate limiting
- Key generation limits
- Domain verification and allowed origins
- Key expiry
- Cloudflare Turnstile during registration

API keys contain high-entropy random values, so a fast cryptographic hash is used on the request verification path instead of a password-oriented slow KDF.

A password has relatively low user-generated entropy and benefits from Argon2 or bcrypt; a randomly generated token does not have the same brute-force characteristics, and adding a slow hash to every autocomplete request would unnecessarily increase latency.

This was choosing security controls based on the actual threat model rather than applying the same primitive everywhere.

## Caching

Repeated autocomplete requests are common, and edits to input cause earlier queries to be repeated. A bounded in-process LRU cache with a configurable TTL keeps the architecture simple and brings a repeated query under 1 ms.

A distributed cache was deliberately not introduced because the current deployment does not require one; Redis or another shared strategy becomes relevant only if the API is horizontally scaled across many instances.

## Observability

Liveness and readiness checks are separate: \`/healthz\` reports process health and \`/readyz\` validates dependencies such as the database and search dataset before reporting readiness.

The application records request timing and search-tier information, so it is possible to see which strategies are being used and where latency comes from.

A public analytics page exposes aggregated usage without publishing individual requests or user-identifiable information.

## Testing and benchmarking

Search systems are easy to optimise for a few examples while accidentally breaking another query pattern, so the suite covers query parsing, query routing, typo correction, result scoring, caching, authentication, and rate limiting.

It also covers API behaviour, database integration, and search behaviour — hundreds of automated tests, alongside dedicated benchmark scripts for overall API latency and individual search tiers.

Performance tests are treated separately from correctness tests because a correct result is not the same as acceptable production performance. Both need validating.

## Tech stack

**Backend:** TypeScript, Bun, Elysia, Zod, Pino.

**Data:** PostgreSQL 18, B-tree indexes, GIN trigram indexes, materialized views, \`COPY FROM STDIN\`.

**API:** REST, OpenAPI 3.1, generated documentation, API-key authentication, rate limiting.

**Infrastructure:** Docker, Docker Compose, Cloudflare Tunnel, GitHub Actions, container health checks.

**Engineering quality:** Bun test, integration testing, performance benchmarks, Biome, TypeScript static checking.

## Deployment

\`\`\`mermaid
flowchart TB
  internet["INTERNET"] --> cloudflare["CLOUDFLARE"]
  cloudflare --> tunnel["CLOUDFLARE TUNNEL"]
  tunnel --> api["G-NAF API CONTAINER"]
  api --> postgres["POSTGRESQL CONTAINER"]
  postgres --> volume["PERSISTENT VOLUME"]
\`\`\`

PostgreSQL stays on the internal Docker network instead of being exposed directly to the public internet. Images are built through CI/CD, and health checks let the deployment environment determine whether the API and database are actually available.

## Dataset refresh

G-NAF is not static — Geoscape publishes refreshed datasets throughout the year — so loading the data once was not sufficient for a maintainable service. Refreshing is a repeatable operational process:

\`\`\`mermaid
flowchart TB
  download["DOWNLOAD NEW G-NAF RELEASE"] --> loader["RUN LOADER"]
  loader --> staging["REFRESH STAGING DATA"]
  staging --> searchdata["REBUILD MATERIALIZED SEARCH DATA"]
  searchdata --> indexes["REBUILD / WARM INDEXES"]
  indexes --> benchmarks["RUN BENCHMARKS"]
  benchmarks --> production["RETURN SERVICE TO PRODUCTION"]
\`\`\`

## Engineering decisions

A major objective was resisting unnecessary complexity. Elasticsearch, Redis, Kubernetes, several microservices, a message broker, and separate ingestion infrastructure were all available options. The requirements could be satisfied by Bun, PostgreSQL, and Docker.

The more useful question was not what technology could be used, but what the smallest architecture is that can reliably meet the requirements.

PostgreSQL was capable of achieving the target latency, so adding a separate search engine would have increased operational complexity without solving a demonstrated problem. Similarly, an in-process cache is sufficient for the current deployment.

## What it demonstrates

G-NAF Address Autocomplete shows that a national-scale address dataset does not automatically require an expensive third-party API or a distributed search platform.

With a purpose-built ingestion pipeline, appropriate PostgreSQL indexes, and query-aware routing, approximately 16 million G-NAF addresses became a fast, self-hosted autocomplete service with measured sub-50 ms p95 performance.

The main lesson is that performance problems should be measured before introducing more infrastructure.

Searching 16 million records initially sounds like a problem requiring a dedicated distributed search engine; in practice, understanding the shape of the workload mattered more.

Optimisation was mostly about avoiding work: routing prefix queries away from fuzzy search, correcting input before expensive queries, caching repeated searches, streaming imports instead of buffering them, and avoiding network calls to external providers entirely.
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
    title: 'G-NAF Address Autocomplete',
    summary:
      'A self-hosted Australian address autocomplete service searching ~16 million Geoscape G-NAF addresses, measured under 50 ms p95 on PostgreSQL indexes alone.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'completed' as const,
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2025-06-01T00:00:00.000Z',
    liveUrl: 'https://gnaf.lst97.dev',
    featured: true,
    // The home loader picks the first `featured` project by `sortOrder`. LAST//OS
    // holds -2 because it *is* this site; Best Maker Pty Ltd sits at -1 and
    // Canto101 at 0, so G-NAF moves to 1 and reads as the fourth slide.
    sortOrder: 1,
    status: 'published' as const,
    // `technologies` is a Payload array field, so each entry is a row object
    // with a `technology` key rather than a bare string.
    technologies: [
      'TypeScript',
      'Bun',
      'Elysia',
      'Zod',
      'Pino',
      'PostgreSQL 18',
      'Docker',
      'GitHub Actions',
      'Cloudflare Tunnel',
      'OpenAPI 3.1',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'G-NAF Address Autocomplete',
      description:
        'A self-hosted autocomplete service over ~16 million Australian addresses, built on PostgreSQL indexes with measured sub-50 ms p95 latency.',
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
