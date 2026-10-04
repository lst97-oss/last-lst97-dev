/**
 * Seeds the Canto101 project, its topics, and its tags.
 *
 * Sibling to `seed-gnaf-project.ts`, `seed-smartplay-project.ts`,
 * `seed-last-os-project.ts`, `seed-wwnz-project.ts` and
 * `seed-best-maker-pty-ltd-project.ts`, and deliberately identical in shape:
 * the Payload local API, a Markdown literal converted with
 * `convertMarkdownToLexical`, and slug-keyed upserts so repeated runs never
 * accumulate duplicates.
 *
 * The ` ```mermaid ` fences in the Markdown below become Lexical `Code` blocks
 * tagged `language: 'mermaid'`, which is exactly what
 * `src/components/site/content/rich-text.tsx` keys on to render a diagram
 * instead of a code listing. The diagrams are transcribed from the project's
 * own architecture notes.
 *
 * Three deliberate differences from its siblings:
 *
 * 1. It is `projectStatus: 'in_progress'` with no `endDate`. The project is
 *    continuing, and marking a live product completed would misstate it on the
 *    listing.
 *
 * 2. It sets `liveUrl` to the public demo deployment but no `repositoryUrl`:
 *    every repository in the project's organisation is private, so a source
 *    link would render as a 404 to a visitor. The demo URL does not make the
 *    project's own deep-dive corpus public — those documents are stamped
 *    `Visibility: Private` in `src/data/projects/canton-101/`, and their
 *    citations carry the private badge, exactly as Wat Wat New Zealand's do.
 *
 * 3. Its `role` string is the shared one, but its technologies describe a
 *    Python micro-service tier rather than a single runtime.
 *
 * `startDate` is the creation date of the project's API server and web app
 * repositories in its GitHub organisation (2026-07-12).
 *
 * Idempotent: matched by slug and updated in place; topics and tags upsert by
 * slug. Every topic and tag slug here is new — `upsertVocabulary` overwrites
 * title and description, so sharing a slug with a sibling would rewrite that
 * sibling's vocabulary.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the Zeabur endpoint that URL
 * needs `?sslmode=no-verify`: the certificate is self-signed.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const PROJECT_SLUG = 'canton-101'

const TOPICS = [
  {
    slug: 'lexical-data',
    title: 'Lexical Data',
    description: 'A curated multi-source Cantonese lexicon with readings, senses, register and difficulty.',
  },
  {
    slug: 'timing-alignment',
    title: 'Timing Alignment',
    description: 'Mapping words to time in real recordings so a karaoke highlight follows the melody.',
  },
  {
    slug: 'sentence-study',
    title: 'Sentence Study',
    description: 'Themed sentences with per-word readings, part of speech, imagery and translation.',
  },
  {
    slug: 'clean-architecture-api',
    title: 'Clean Architecture API',
    description: 'Domain, application, infrastructure and interface layers with dependencies pointing inward.',
  },
] as const

const TAGS = [
  {
    slug: 'multiple-readings',
    title: 'Multiple Readings',
    description: 'Jyutping, Yale and IPA for the same word, with every valid reading kept.',
  },
  {
    slug: 'micro-service-isolation',
    title: 'Micro-Service Isolation',
    description: 'Small single-purpose services behind signed internal calls that the browser can never reach.',
  },
  {
    slug: 'seed-snapshots',
    title: 'Seed Snapshots',
    description: 'Versioned, idempotent seed artifacts every environment consumes from one place.',
  },
  {
    slug: 'contract-drift-gates',
    title: 'Contract Drift Gates',
    description: 'Generated clients committed and drift-checked so a contract break fails CI.',
  },
  {
    slug: 'speech-assessment',
    title: 'Speech Assessment',
    description: 'Grading a spoken attempt and returning a score, feedback and an audio replay.',
  },
] as const

/**
 * The whole shape in one diagram: the web app is the only browser-facing
 * surface, and the API server fans out to internal Python services it never
 * exposes.
 */
const SYSTEM_DIAGRAM = `flowchart TB
  subgraph client["Learner"]
    web["Web app<br/>React SPA + thin API<br/>auth, rewards, proxies"]
  end
  subgraph core["Platform backend"]
    api["API server<br/>content, search, accounts"]
    db[("PostgreSQL<br/>lexicon + lyrics + sentences")]
  end
  subgraph micro["Micro-services (Python)"]
    nlp["NLP<br/>tokenisation, POS, romanisation"]
    align["Alignment<br/>word-level lyric timing"]
    download["Download<br/>audio retrieval"]
    enrich["Enrichment<br/>translation, themes, difficulty"]
    tts["Speech<br/>Cantonese synthesis"]
    images["Images<br/>scene illustrations"]
  end
  web --> api
  api --> db
  api --> nlp
  api --> align
  align --> download
  api --> enrich
  api --> tts
  api --> images`

/**
 * The import pipeline that produces karaoke, drawn as a straight line because
 * every step's output is the next step's input and nothing is skipped.
 */
const ALIGNMENT_PIPELINE_DIAGRAM = `flowchart TB
  src["Song selected in the app"] --> dl["Micro-service retrieves audio"]
  dl --> prep["Audio prepared:<br/>vocals isolated"]
  prep --> map["Alignment micro-service<br/>maps words to time"]
  map --> validate["Result validated<br/>and quality-scored"]
  validate --> store["Timings stored with the song,<br/>original values kept auditable"]
  store --> play["Karaoke playback:<br/>highlight follows the timing"]
  store --> link["Lyric lines linked to<br/>dictionary entries"]`

/**
 * The corpus build, from public sources to a snapshot every environment seeds
 * from. Deliberately not scraped at request time.
 */
const DATA_PIPELINE_DIAGRAM = `flowchart TB
  srcs["Public Cantonese dictionaries"] --> norm["Normalised source files"]
  norm --> enrich["Enriched:<br/>readings, romanisation, POS"]
  enrich --> merge["Merged multi-source lexicon<br/>+ curated scenario tags"]
  merge --> classify["Difficulty, register,<br/>script-variant forms"]
  classify --> snapshot["Versioned seed snapshot"]
  lyrics["Curated lyric corpus"] --> link["Line tokens linked to<br/>dictionary entries"]
  link --> snapshot
  snapshot --> seeded[("Seeded into PostgreSQL")]
  seeded --> query["Indexed search +<br/>rich lookup queries"]`

/**
 * The layering rule inside the API server: dependencies point inward, and only
 * the interface layer speaks HTTP.
 */
const LAYERING_DIAGRAM = `flowchart TB
  interface["interface<br/>routes, middleware, schemas"]
  application["application<br/>use cases"]
  domain["domain<br/>rules, entities, ports"]
  infra["infrastructure<br/>repositories, auth, storage, clients"]
  interface --> application
  application --> domain
  infra --> domain
  infra -. "implements the ports" .-> domain
  interface -.-> infra`

const MARKDOWN = `## The problem

Learning spoken Cantonese is hard for three reasons no existing tool solves well:

1. **Written resources and spoken language diverge.** Most Cantonese material is written Standard Chinese. A learner can read a lyric or a news headline but cannot *hear* it.
2. **Romanisation without timing is dead weight.** Jyutping tells you what a syllable sounds like, not when it lands in a song. Learners need to see the syllable move with the music.
3. **Meaning lives in context, not in word lists.** Knowing 佢 means "he/she" is useless if you cannot hear it inside real speech.

This platform is built around a single content spine: a large, curated Cantonese lexical corpus — words, characters, pronunciations, meanings, difficulty — plus a lyric corpus that links that vocabulary back to real songs. Everything else is a different way of reading the same spine.

## What it does

| Area | Capability |
| --- | --- |
| **Dictionary** | Word and character lookup with Jyutping, Yale and IPA; multiple readings; component characters; synonyms/antonyms; glosses; difficulty and register labels. |
| **Lyrics** | Thousands of songs with searchable lines, artist/lyricist/theme tags, and per-word linking back to dictionary entries. |
| **Karaoke** | Line-by-line and word-by-word singing practice with real timing derived from the audio, so the highlighted word follows the melody. |
| **Sentences** | Themed study sentences with per-word POS, readings, imagery, and translations into four interface languages. |
| **Talk lessons** | Real spoken Cantonese segmented into captioned, translatable, transliterated lines. |
| **Pronunciation** | Tone/initial/final search, an audio reference for every syllable, and speech-assessment exercises. |
| **Practice loop** | Flashcards, echo and speaking challenges, XP/level/streak rewards, and an AI chat partner for translation drills. |

## System shape

Three cooperating pieces, deployed together:

- **API server** — the product's backbone. Serves all learning content, accounts, storage and search from PostgreSQL, and orchestrates the AI and media micro-services.
- **Web app** — the learner-facing single-process app: a React single-page app plus a thin backend for auth, rewards, analytics and provider proxies. It reads learning content from the API server.
- **Micro-services** — small, single-purpose services for the language, AI and media work the API server does not want to host.

\`\`\`mermaid
${SYSTEM_DIAGRAM}
\`\`\`

The web app is the only browser-facing surface. The API server owns all learning content and never exposes a micro-service directly — every request from the browser is answered by the API server, which fans out to the internal services as needed. Internal calls are authenticated, so nothing is callable from outside the deployment.

## Core workflows

### 1. Dictionary lookup

A search resolves to an entry carrying readings, meanings, tags, difficulty and component characters; the entry is then enriched with lyric lines that actually contain the word, and the lexicon page renders from both. A miss returns the standard error envelope rather than an empty page.

That two-part result is the product's central promise working in one place: a learner goes "word → song" instead of stopping at a dictionary entry.

### 2. Song import to karaoke

The longest pipeline, and the one that produces the karaoke experience.

\`\`\`mermaid
${ALIGNMENT_PIPELINE_DIAGRAM}
\`\`\`

The app deliberately never invents a boundary. Results carry quality evidence and their provenance, and anything uncertain is surfaced for review instead of silently smoothed over — because an alignment that is plausible but half a second out produces karaoke that looks correct and teaches the wrong thing.

### 3. Sentence study

A themed sentence is tokenised per word, each word resolved to its part of speech and reading from the lexicon. The sentence is translated, themed and sentiment-labelled, and paired with a scene illustration. The page then shows the sentence's structure, per-word readings, the illustration, the translation and related sentences.

Because annotation is a lookup rather than a hand-written field, adding a sentence does not mean annotating it, and the reading shown in a sentence cannot disagree with the reading shown on the entry — it is the same record.

### 4. Talk lessons

A recording is segmented on the pauses and phrase structure rather than on fixed intervals, then captioned. An enrichment micro-service adds translation, transliteration, notes and vocabulary; the lesson and its segments are stored; the player offers segmented audio, synchronised captions and per-segment replay.

Transliteration matters here for a specific learner state: someone who cannot read the characters has a translation but no way to connect it to the sound they just heard.

### 5. Practice and progress

A graded attempt returns a score, feedback and an audio replay. The progress event is recorded idempotently per attempt, so re-attempting does not double-count. XP, level and streak update, and the dashboard reflects the change.

## The data pipeline

Content quality is the product, so the data is built deliberately rather than scraped at request time.

\`\`\`mermaid
${DATA_PIPELINE_DIAGRAM}
\`\`\`

Sources are normalised before anything else reads them — public dictionaries disagree about record shape, fields, encoding and character variants, and a source that cannot be normalised is skipped rather than allowed to propagate malformed records. Records are then enriched with romanisation systems beyond the primary one and with every valid reading kept, merged across sources, and classified with difficulty, register and script-variant forms.

The output is a **versioned seed snapshot** rather than a pile of ad-hoc imports: seeding is repeatable, reruns are idempotent, and a snapshot can be published and consumed by every environment from one place. That is what makes fixing a corpus entry a reviewable pipeline change instead of a manual production database edit.

## Architecture

The API server is layered, and the rule is one sentence: \`domain\` knows nothing about frameworks, \`application\` orchestrates, \`infrastructure\` implements the ports, and \`interface\` is the only layer that speaks HTTP.

\`\`\`mermaid
${LAYERING_DIAGRAM}
\`\`\`

The value of the rule is testability of the part that matters. Business rules are pure TypeScript and framework-free, so they are testable without a database or a request — which is what lets the parts that compute timings and difficulty labels be tested deterministically.

### Why each micro-service is separate

Each earns its separation by the same criterion: the work is slow, bursty, or independently failing. Alignment depends on model weights and a Python runtime. Synthesis loads an audio model. Image generation calls an external provider. Enrichment is a batch operation over content. None of these has the same reliability or resource profile as serving a dictionary lookup, and coupling them would mean a model that fails to load also takes down search.

Keeping them small is a second deliberate choice: each is one concern with a contract, so it can be started only when the deployment needs it, scaled independently, and replaced without touching the rest.

## Tech stack

| Layer | Choice |
| --- | --- |
| **API runtime** | Deno |
| **API framework** | Hono with schema-driven OpenAPI |
| **Data access** | Drizzle ORM on PostgreSQL, with vector and trigram extensions |
| **Auth** | Better Auth (sessions, OAuth, email) |
| **Contracts** | OpenAPI-first, generated TypeScript clients |
| **Web app** | React with Vite and Tailwind, single-process server |
| **i18n** | Four interface languages |
| **Storage** | S3-compatible object storage |
| **Observability** | OpenTelemetry with structured logs |
| **Micro-services** | Python, one concern each, all behind signed internal APIs |
| **Deploy** | Docker Compose behind a single edge proxy |

## Deploy

- The **edge proxy** is the only public entry point. It routes browser traffic to the web app and API traffic to the API server, and terminates TLS.
- The **API server** runs with scoped permissions and no general egress — it reaches its database and nothing else.
- **Micro-services** are internal-only, never published, and each requires a signed request from the API server, so a compromised browser session cannot call a model or download service directly.
- The **database** sits behind a connection pooler and is not exposed.
- Optional services are started only when the deployment needs them.

Promoting a change is CI-driven: type-check, lint, format, client-drift gates and tests must all pass before an image is built and rolled out.

## Quality gates

The gates are organised around places where a silent wrong answer is worse than an error.

- **Deterministic API generation** — the OpenAPI spec and typed clients are generated, and a drift check fails CI if committed output no longer matches. Committing the generated client is what makes the check meaningful; regenerating during each build would mean nothing ever fails.
- **Contract gates** — micro-service clients are generated from committed contract snapshots and drift-checked, so a service contract change cannot slip through. A signature verifies the caller, not the shape.
- **Schema readiness** — startup verifies the schema is present instead of failing later at query time, turning a deployment mismatch into an attributable boot failure.
- **Provenance** — alignment results carry their quality evidence and the original values, kept auditable rather than repaired into looking correct.
- **Tests** — co-located unit tests next to the code, plus type, lint and format gates.

## License

Private project. Learning content is used for educational purposes; lyrics and recordings remain the property of their rights holders and are used under fair-use for study. Check the repository license before any redistribution.
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
    title: 'Canto101',
    summary:
      'A Cantonese-learning platform built on a curated lexical corpus and word-level karaoke timing — dictionary lookup, sentence study, talk lessons and a graded practice loop served by a clean-architecture API.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'in_progress' as const,
    // The creation date of the project's API server and web app repositories.
    // No `endDate`: the project is continuing.
    startDate: '2026-07-12T00:00:00.000Z',
    // The public demo deployment. This does not make the project's own deep-dive
    // corpus public — those documents are stamped `Visibility: Private` in
    // `src/data/projects/canton-101/` and their citations carry the private
    // badge, exactly as Wat Wat New Zealand's do.
    liveUrl: 'https://cantonese101trae.zeabur.app/',
    // No `repositoryUrl`: every repository in the project's organisation is
    // private, so a source link would render as a dead link to a visitor.
    featured: true,
    // Third featured slot, behind the portfolio itself at -2 and Best Maker at
    // -1. The home loader takes featured projects in `sortOrder` order.
    sortOrder: 0,
    status: 'published' as const,
    // `technologies` is a Payload array field, so each entry is a row object
    // with a `technology` key rather than a bare string.
    technologies: [
      'Deno',
      'Hono',
      'Zod OpenAPI',
      'Drizzle ORM',
      'PostgreSQL 18',
      'pgvector',
      'Better Auth',
      'React 19',
      'Vite',
      'Tailwind CSS',
      'Bun',
      'FastAPI',
      'Python',
      'Docker Compose',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'Canto101',
      description:
        'A Cantonese-learning platform combining a dictionary-grade lexical corpus, word-level karaoke timing, sentence study and a graded practice loop behind a clean-architecture API.',
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
