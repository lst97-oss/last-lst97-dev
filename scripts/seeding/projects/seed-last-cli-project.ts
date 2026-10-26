/**
 * Seeds the last-cli project, its topics, and its tags.
 *
 * Sibling to `seed-gnaf-project.ts`, `seed-smartplay-project.ts`,
 * `seed-last-os-project.ts`, `seed-wwnz-project.ts`,
 * `seed-best-maker-pty-ltd-project.ts` and `seed-canton-101-project.ts`, and
 * deliberately identical in shape: the Payload local API, a Markdown literal
 * converted with `convertMarkdownToLexical`, and slug-keyed upserts so repeated
 * runs never accumulate duplicates.
 *
 * The ` ```mermaid ` fences in the Markdown below become Lexical `Code` blocks
 * tagged `language: 'mermaid'`, which is exactly what
 * `src/components/site/content/rich-text.tsx` keys on to render a diagram
 * instead of a code listing.
 *
 * This post covers the CLI and the two starters it scaffolds together, because
 * the CLI has no meaning without them: `last-cli` is the entry point, the
 * templates are the product. Both template repositories are linked in the body
 * and named in the summary.
 *
 * Three deliberate differences from its siblings:
 *
 * 1. It is `projectStatus: 'in_progress'` with no `endDate`. The CLI and both
 *    templates are in active use and still changing.
 *
 * 2. It links the npm package as `liveUrl` rather than a deployed site. The CLI
 *    is distributed through npm; there is no hosted demo to open.
 *
 * 3. The project deliberately has no `featured` slot. It is developer tooling,
 *    not a product page, and the featured window is already taken at -2, -1, 0
 *    and 1.
 *
 * `startDate` is the creation date of the `last-cli` repository (2026-10-11);
 * the blank template was created later, on 2026-10-19, but the CLI and the
 * Payload template started the same day.
 *
 * Idempotent: matched by slug and updated in place; topics and tags upsert by
 * slug. The topic and tag slugs here are new, so this seed cannot rewrite a
 * sibling's vocabulary. Reused vocabulary would need the identical description
 * to stay a no-op.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the hosted endpoint (Railway)
 * that URL needs `?sslmode=no-verify`: the certificate is self-signed.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'
import type { LexicalNodes_206F9798 } from '../../../payload-types'
import { savedDocument } from '../payload-result'

const PROJECT_SLUG = 'last-cli'

const TOPICS = [
  {
    slug: 'project-scaffolding',
    title: 'Project Scaffolding',
    description: 'Turning a repeated project shape into a generator instead of copying files by hand.',
  },
  {
    slug: 'starter-templates',
    title: 'Starter Templates',
    description: 'A bootable baseline an application starts from, with the load-bearing wiring already proven.',
  },
  {
    slug: 'software-craft',
    title: 'Software Craft',
    description: 'Patterns repeated consistently across many independent projects, and the reasons behind them.',
  },
] as const

const TAGS = [
  {
    slug: 'template-pinning',
    title: 'Template Pinning',
    description: 'Templates referenced by commit so a generator cannot pick up an unreviewed change.',
  },
  {
    slug: 'interactive-prompts',
    title: 'Interactive Prompts',
    description: 'A guided terminal path with a prompt-free flag path for automation.',
  },
  {
    slug: 'boot-contract',
    title: 'Boot Contract',
    description: 'The wiring a starter must boot with, held by a smoke check rather than by memory.',
  },
  {
    slug: 'open-source',
    title: 'Open Source',
    description: 'Self-hostable and reusable by anyone.',
  },
] as const

/**
 * One command, two paths: interactive prompts when a terminal is attached, or
 * the default template and setup when `--yes` already answers everything.
 */
const CLI_FLOW_DIAGRAM = `flowchart TB
  run["last-cli create my-app"] --> parse["Parse arguments<br/>command, name, --yes"]
  parse --> tty{"Interactive terminal?"}
  tty -- no --> refuse["Require a project name and --yes"]
  tty -- yes --> prompts["Choose a template<br/>Install dependencies?<br/>Initialize Git?"]
  parse -- "--yes" --> pinned["Select the default template"]
  prompts --> pinned
  pinned --> download["Download the pinned commit<br/>giget"]
  download --> finish["Rename package.json and README<br/>copy .env.example to .env"]
  finish --> setup["Optional: git init and bun install"]
  setup --> next["Print the next commands"]`

/**
 * The blank template owns the backend kernel; the Payload template mirrors it
 * and adds the CMS wiring. The CLI only points at the two releases.
 */
const TEMPLATE_RELATION_DIAGRAM = `flowchart TB
  subgraph starters["Two starters"]
    payload["last-payload-tanstack-start-template<br/>Payload CMS plus TanStack Start"]
    blank["last-tanstack-start-template<br/>TanStack Start, no CMS"]
  end
  kernel["Canonical backend kernel<br/>src/server"] --> blank
  blank -.->|"weekly kernel sync"| payload
  cli["last-cli"] --> payload
  cli --> blank
  payload --> cms["CMS-backed product<br/>admin, content, users"]
  blank --> business["Business app or API<br/>no CMS"]`

/**
 * The generated project is booted by the user, not by the CLI. This is the
 * sequence both templates print and document.
 */
const BOOT_SEQUENCE_DIAGRAM = `flowchart LR
  env["Edit .env"] --> db["bun run db:up"]
  db --> migrate["bun run db:migrate"]
  migrate --> gen["Generate types and routes"]
  gen --> dev["bun run dev"]
  dev --> smoke["bun run smoke"]`

const MARKDOWN = `## The problem

Every new project starts with the same decisions. Where does server code live? What shape does an error have on the wire? How is the database reached, and who owns the connection pool? Which health endpoint does the platform probe? How does CI prove the application actually boots? How is the build wired so a route handler is not accidentally bundled into the browser?

Answering those questions once per project is how a portfolio turns into a set of snowflakes. The answer is not a framework: it is a starter that already made the decisions, plus a generator that can hand it to you without a manual copy-paste.

## What last-cli is

\`last-cli\` is a small scaffolding CLI for my own projects. It does one thing: copy a maintained LAST starter into a new directory, rename it, and leave a bootable project. It is published on npm as \`@lst97-oss/last-cli\`, currently at 0.2.2, and it is deliberately personal-use — it is the tool I reach for, not a general-purpose generator with a plugin ecosystem.

\`\`\`shell
bunx --bun --package @lst97-oss/last-cli last-cli create my-app
npx @lst97-oss/last-cli create my-app
\`\`\`

The Bun form is the primary path. The npm form works with Node.js 22 or newer. The command creates \`my-app\`, rewrites its package name and README title, copies \`.env.example\` to \`.env\`, and optionally initialises Git and installs dependencies. It does not run migrations, start a database, or touch an existing project.

## How a project is created

\`\`\`mermaid
${CLI_FLOW_DIAGRAM}
\`\`\`

The command parses a tiny argument grammar: \`create\`, an optional project name, and \`--yes\`. There are no subcommands beyond \`create\` and no options beyond the flag. A non-interactive invocation without \`--yes\` is refused with instructions rather than left waiting on a prompt that no terminal can answer.

The destination must not already exist, or must be an empty directory. A non-empty directory is refused before anything is downloaded, so the CLI cannot overwrite work. The download uses \`giget\` against a GitHub repository at a pinned commit. When a download or the post-download rewrite fails, a directory the CLI created is removed; a directory that already existed is left alone, because deleting it would delete the user's files.

Naming is intentionally simple: the project name must be a lowercase slug of letters, numbers, and hyphens. The package manifest and README H1 are rewritten from that name, and \`.env\` is copied from the example. Setup commands are then attempted. A missing \`git\` or \`bun\`, or a failed install, becomes a warning; the project is kept and the warning tells the user which command to run in the new directory. The CLI reports success with the next commands, not with a hidden side effect.

## Two templates, two use cases

| Template | Use it when | What it gives you |
| --- | --- | --- |
| [last-payload-tanstack-start-template](https://github.com/lst97-oss/last-payload-tanstack-start-template) | The product needs editorial content, an admin, and Payload-managed users | Payload v4 + TanStack Start, \`/admin\`, \`/api/*\`, users-only auth, lexical content, committed migrations |
| [last-tanstack-start-template](https://github.com/lst97-oss/last-tanstack-start-template) | The product is a business application or an API and needs no CMS | TanStack Start, the canonical backend kernel, live and ready probes, the full shadcn registry |

The two are not competing starters. They share one backend kernel and one frontend toolchain, and differ only in whether Payload sits in front of the application. That is the whole selection criterion the CLI shows: "Payload + TanStack Start" or "Blank TanStack Start".

## The Payload + TanStack Start template

This is the CMS-backed starter. It boots standalone: a placeholder \`/\`, the Payload admin at \`/admin\`, and Payload's REST surface at \`/api/*\`. The collection surface is intentionally tiny — users with auth, and a plain lexical editor — because a starter that ships ten half-used collections is harder to delete than to extend.

The parts that are not obvious from a file tree:

- **Admin shell.** \`withPayloadRoot\` hands the document to Payload on admin routes, so \`data-theme\`, \`dir\`, and \`lang\` rules match. The admin bridge, import map, admin route, and not-found handling live in \`src/lib/payload/\`.
- **Committed migrations.** The Postgres adapter runs with \`push: false\` and \`prodMigrations\`, so schema changes go through \`src/migrations/\` and \`bun run db:migrate\`, never through dev auto-push.
- **Vendored RSC wiring.** The Payload TanStack plugins in \`vendor/\` are the RSC-independent subset. They are copied rather than wrapped, and re-copied after a \`@payloadcms/tanstack-start\` bump.
- **The kernel.** The same \`src/server/\` envelope, errors, request context, validation, database seam, and health slice described below.
- **A development-only \`/ui\` showcase.** It exercises the installed shadcn components; production requests return 404.

The template is explicit about what it leaves out: real auth beyond Payload users, more collections, i18n, pagination UI, rate limiting, OpenAPI, email, storage, RAG, and chat. Those are application decisions, not starter decisions.

## The blank TanStack Start template

This is the CMS-free starter, and it owns the canonical business kernel. It boots a placeholder \`/\` and two health endpoints, \`/api/live\` and \`/api/ready\`, on top of the same envelope, validation, Bun-native Postgres client, structured logger, graceful shutdown, Compose file, smoke check, and CI pipeline as its Payload sibling.

It also ships the full shadcn registry in \`src/components/ui/\`, the shared Tailwind v4 semantic tokens, and the development-only \`/ui\` showcase. There is no Payload, no \`/admin\`, no collection layer, and no real auth: \`withAuth\` is a 501 stub where an application plugs in its own session verification.

That makes it the right starting point for a service whose content is not editorial — a business application, an internal tool, or an API — and the wrong starting point if the first requirement is "editors need a login and a content form".

## One kernel, mirrored rather than forked

\`\`\`mermaid
${TEMPLATE_RELATION_DIAGRAM}
\`\`\`

The blank template is the source of truth for \`src/server/\`. The Payload template mirrors it file for file, with three deliberate CMS-only extras: \`env.ts\` gains the Payload secrets and public origin, \`security/payload-server-url.ts\` adds the production loopback guard, and \`payload-shutdown.ts\` also drains cached Payload instances.

The mirror is maintained by a sync script driven by \`scripts/kernel-sync.json\`. CI runs it weekly and opens a pull request when the Payload copy has drifted. The rule that makes this work is directional: fix the kernel in the blank template first, then mirror it. Editing the Payload copy directly creates drift that the next sync will silently propose to undo.

## Templates are pinned, not floated

The CLI does not download a branch, a tag, or the latest release. Both template sources are 40-character commit hashes, and a test asserts that shape. That is the difference between a generator and a moving target: upgrading \`last-cli\` is the only way a generated project picks up a new template revision, and the changelog records which template release each CLI version pins.

Version 0.2.2 pins \`last-payload-tanstack-start-template\` v0.4.1 and \`last-tanstack-start-template\` v0.1.2. A template fix that has not been reviewed for a CLI release does not reach new projects by accident.

## What every generated project inherits

The two starters share more than a directory layout:

- **HTTP contract.** A fixed \`{ data }\` / \`{ error: { code, message } }\` envelope, a typed \`HttpError\` whose 5xx messages are hidden on the wire, \`withContext\` for request IDs and never-throwing error mapping, and zod helpers for JSON bodies, query strings, and pagination.
- **Data access.** One shared Bun-native Postgres client with a Drizzle seam. No per-module pool, no second connection-string parser, no migration runner hidden inside a module.
- **Operations.** \`/api/live\` never touches I/O, \`/api/ready\` probes the database, security headers are minimal and explicit, and shutdown drains Nitro on \`SIGINT\`/\`SIGTERM\`.
- **Boot proof.** \`compose.yaml\` for local Postgres, \`bun run smoke\` for the running server, and CI that runs format, lint, typecheck, migrations, tests, a node-server build, and the smoke check against the live process.
- **Frontend.** TanStack Query, Form, and Store already wired; Tailwind v4 semantic tokens; shadcn \`base-nova\` components; Base UI toaster; theme provider; site not-found and error boundaries.
- **Toolchain.** A single pinned Bun version, \`bun fmt\` for formatting, Biome for lint and import order, and \`bun check\` for types.

None of this is novel. The value is that it is decided once and then copied, so the first commit of a new project is about the product rather than about plumbing.

## The first five minutes

\`\`\`mermaid
${BOOT_SEQUENCE_DIAGRAM}
\`\`\`

The generated project is not running yet. The CLI prints the path, and the template README repeats it with the details:

\`\`\`shell
cd my-app
# edit .env
bun run db:up
bun run db:migrate
bun run generate:types      # Payload template only
bun run generate:importmap  # Payload template only
bun run generate-routes
bun run dev
\`\`\`

The blank template skips the two Payload generation commands and goes from \`db:up\` to \`dev\`. The Payload template additionally needs \`bunx payload create-first-user\` before \`/admin\` has an account to sign in with. Docker is optional: any Postgres matching \`.env\` works.

## Deliberate exclusions

The CLI has one command and no update, eject, or registry mechanism. A generated project belongs to its owner; there is no hidden link back to the generator.

The templates are equally deliberate. The Payload starter excludes real auth beyond its users collection, extra collections, i18n, pagination UI, rate limiting, OpenAPI, email, storage, RAG, and chat. The blank starter excludes Payload entirely and leaves auth as a 501 stub. Both choices push application decisions into the application, where they can be made with actual requirements instead of inherited guesses.

## Engineering decisions

1. **Copy the template instead of rendering it.** The repository you can read is exactly what the CLI downloads. There is no second template language, no token table, and no generated file that does not exist upstream.
2. **Pin the source commit.** A generator that follows \`main\` cannot be reproduced. A 40-character hash can.
3. **Fail closed on the destination.** Non-empty directories are refused before download, and only a directory the CLI created is removed after a failure.
4. **Separate setup from creation.** \`git init\` and \`bun install\` are conveniences, not preconditions. A machine without them still gets a usable project and an actionable warning.
5. **Inject the process edges for tests.** \`createProject\` accepts \`download\` and \`runCommand\` dependencies, so argument parsing, directory rules, rewrites, and cleanup are tested without prompting, cloning, or spawning anything.
6. **Keep the surface small.** The CLI has no configuration file because it has nothing to configure. The template is the configuration.

## Current status

\`last-cli\` is personal-use tooling, currently at 0.2.2 under the MIT license. Both templates are public and can be cloned directly without the CLI; the CLI simply removes the copy, rename, and setup steps.

| Repository | Role |
| --- | --- |
| [lst97-oss/last-cli](https://github.com/lst97-oss/last-cli) | The scaffolding CLI and its tests |
| [lst97-oss/last-payload-tanstack-start-template](https://github.com/lst97-oss/last-payload-tanstack-start-template) | Payload v4 + TanStack Start starter |
| [lst97-oss/last-tanstack-start-template](https://github.com/lst97-oss/last-tanstack-start-template) | CMS-free TanStack Start starter and canonical kernel |

The npm package is [@lst97-oss/last-cli](https://www.npmjs.com/package/@lst97-oss/last-cli).
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
  const content = convertMarkdownToLexical<LexicalNodes_206F9798>({ editorConfig, markdown: MARKDOWN })

  const topicIds = await upsertVocabulary(payload, 'topics', TOPICS)
  const tagIds = await upsertVocabulary(payload, 'tags', TAGS)

  const data = {
    slug: PROJECT_SLUG,
    title: 'last-cli',
    summary:
      'A personal-use CLI that scaffolds a new LAST project from a pinned template, plus the two starters it offers: Payload CMS with TanStack Start, or a CMS-free TanStack Start application on the same backend kernel.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'in_progress' as const,
    // The creation date of the last-cli repository. No `endDate`: the CLI and
    // both templates are still changing.
    startDate: '2026-10-11T00:00:00.000Z',
    repositoryUrl: 'https://github.com/lst97-oss/last-cli',
    // The CLI is distributed through npm. Both templates are linked in the body
    // rather than here, because `liveUrl` is a single field.
    liveUrl: 'https://www.npmjs.com/package/@lst97-oss/last-cli',
    // Developer tooling, not a product page. The featured window is taken at
    // -2, -1, 0 and 1.
    featured: false,
    // Behind Wat Wat New Zealand at 10, in the order the archive reads.
    sortOrder: 11,
    status: 'published' as const,
    technologies: [
      'TypeScript 7',
      'Bun',
      'Node.js',
      'npm',
      '@clack/prompts',
      'giget',
      'Biome',
      'GitHub',
      'Payload CMS 4',
      'TanStack Start',
      'React 19',
      'Nitro',
      'PostgreSQL',
      'Drizzle ORM',
      'Tailwind CSS 4',
      'Base UI',
      'shadcn/ui',
      'Docker Compose',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'last-cli — LAST project scaffolding',
      description:
        'A personal-use scaffolding CLI that creates a LAST project from a pinned template: Payload CMS with TanStack Start, or a CMS-free TanStack Start starter on the same backend kernel.',
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
  const saved = savedDocument(
    current
      ? await payload.update({ collection: 'projects', id: current.id, data, overrideAccess: true })
      : await payload.create({ collection: 'projects', data, overrideAccess: true }),
  )

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
