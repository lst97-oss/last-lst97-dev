/**
 * Seeds the last-comments project, its topics, and its tags.
 *
 * Sibling to `seed-gnaf-project.ts`, `seed-smartplay-project.ts`,
 * `seed-last-os-project.ts`, `seed-wwnz-project.ts`,
 * `seed-best-maker-pty-ltd-project.ts`, `seed-canton-101-project.ts` and
 * `seed-last-cli-project.ts`, and deliberately identical in shape: the Payload
 * local API, a Markdown literal converted with `convertMarkdownToLexical`, and
 * slug-keyed upserts so repeated runs never accumulate duplicates.
 *
 * The ` ```mermaid ` fences in the Markdown below become Lexical `Code` blocks
 * tagged `language: 'mermaid'`, which is exactly what
 * `src/components/site/content/rich-text.tsx` keys on to render a diagram
 * instead of a code listing.
 *
 * The post covers both repositories because they are one system: the service
 * owns storage, identity, moderation and abuse control; the widgets repository
 * owns the four drop-in clients that talk to it. The service is a product grown
 * from `last-payload-tanstack-start-template`, and that lineage is a section of
 * the post rather than a footnote, because it explains why the boot wiring was
 * already settled when the comment domain was written.
 *
 * Two deliberate differences from its siblings:
 *
 * 1. It is `projectStatus: 'in_progress'` with no `endDate`. The project is
 *    under heavy development, as the post says plainly.
 *
 * 2. It sets both `repositoryUrl` and `liveUrl`: the service repository is
 *    public and the hosted instance is the live demonstration of the stack.
 *
 * `startDate` is the creation date of the widgets repository (2026-10-18),
 * which came before the service repository (2026-10-21).
 *
 * Idempotent: matched by slug and updated in place; topics and tags upsert by
 * slug. Slugs shared with an existing sibling keep its exact title and
 * description, so the update is a no-op; new slugs describe vocabulary this
 * project introduces.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the hosted endpoint (Railway)
 * that URL needs `?sslmode=no-verify`: the certificate is self-signed.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const PROJECT_SLUG = 'last-comments'

const TOPICS = [
  {
    slug: 'comment-systems',
    title: 'Comment Systems',
    description: 'Embeddable discussion threads with identity, voting, moderation and abuse controls.',
  },
  {
    slug: 'security-and-abuse',
    title: 'Security & Abuse Prevention',
    description: 'Turnstile, rate limits, signed context, moderation, and fail-closed transactional workflows.',
  },
  {
    slug: 'cms-and-content',
    title: 'CMS & Content',
    description: 'Structured editorial content, publishing workflows, and indexing that follows the CMS.',
  },
] as const

const TAGS = [
  {
    slug: 'framework-parity',
    title: 'Framework Parity',
    description: 'The same widget behaviour shipped in React, Vue, Angular and plain HTML.',
  },
  {
    slug: 'drop-in-widgets',
    title: 'Drop-in Widgets',
    description: 'A comment UI a host imports and styles without building one.',
  },
  {
    slug: 'moderation',
    title: 'Moderation',
    description: 'Hiding, deleting, locking and reviewing user content with an audit trail.',
  },
  {
    slug: 'plugin-system',
    title: 'Plugin System',
    description: 'Trusted server modules extending validation, screening and event delivery.',
  },
  {
    slug: 'self-hosted-services',
    title: 'Self-Hosted Services',
    description: 'Running infrastructure directly rather than renting it from a managed provider.',
  },
  {
    slug: 'authentication',
    title: 'Authentication',
    description: 'Identity, sessions, and access control in front of a private application.',
  },
] as const

/**
 * Two data stores, one application: Payload owns the CMS and its admin users;
 * the business database owns comment identity, tenancy, threads and votes.
 */
const SYSTEM_DIAGRAM = `flowchart TB
  subgraph host["Host site"]
    page["Blog, docs or project page"]
    widget["Comment widget<br/>React, Vue, Angular or vanilla"]
  end
  subgraph service["last-comments application"]
    routes["TanStack Start routes<br/>comments, moderation, auth"]
    kernel["Business kernel<br/>sites, pages, comments, plugins"]
    payload["Payload CMS<br/>admin, posts, media, users"]
    worker["Plugin worker<br/>transactional outbox"]
  end
  business[("Business PostgreSQL<br/>auth, sites, pages, comments, votes")]
  cms[("Payload PostgreSQL<br/>users, posts, media")]
  turnstile["Cloudflare Turnstile"]
  filter["OpenRouter filter decider"]

  page --> widget
  widget -->|"same-origin proxy or registered CORS"| routes
  routes --> kernel
  kernel --> business
  kernel --> payload
  payload --> cms
  kernel --> turnstile
  kernel --> filter
  worker --> business`

/**
 * The write path, in the order the route and use case actually run it. A
 * screening hit persists the row as hidden rather than rejecting the write.
 */
const COMMENT_PIPELINE_DIAGRAM = `flowchart TB
  request["POST /api/comments"] --> origin{"Origin registered<br/>for this site?"}
  origin -- no --> reject["403 ORIGIN_NOT_ALLOWED"]
  origin -- yes --> identity{"Session present?"}
  identity -- yes --> signed["Signed-in identity"]
  identity -- no --> guest["Guest display name required"]
  signed --> rate["Rate limit<br/>create: 5 per 10 minutes"]
  guest --> rate
  rate --> verify["Turnstile verification"]
  verify --> screen["Filter screening<br/>bad words plus LLM decider"]
  screen -->|"allow"| visible["Insert visible comment"]
  screen -->|"hide"| hidden["Insert hidden for review"]
  visible --> outbox["Write plugin outbox event"]
  hidden --> outbox`

/**
 * Four native implementations, one framework-free client, one theme, one
 * published package. Framework libraries stay optional peers.
 */
const WIDGET_PACKAGE_DIAGRAM = `flowchart TB
  client["Framework-free client<br/>fetch, errors, markdown, thread tree"]
  theme["Shared theme<br/>Tailwind v4 and base-nova tokens"]
  react["React widget"]
  vue["Vue widget"]
  angular["Angular widget"]
  vanilla["Plain HTML widget"]
  pkg["One published npm package<br/>react, vue, angular, vanilla, client, theme"]

  client --> react
  client --> vue
  client --> angular
  client --> vanilla
  theme --> react
  theme --> vue
  theme --> angular
  theme --> vanilla
  react --> pkg
  vue --> pkg
  angular --> pkg
  vanilla --> pkg`

const MARKDOWN = `## The problem

Comments look like a solved problem until a site needs them for real. A hosted embed decides where the data lives, what the sign-in flow looks like, how moderation works, and how much of the host site's design survives. Building one from scratch means implementing identity for guests and accounts, a thread model, voting, edit windows, moderation state, abuse controls, and then rebuilding the same client for every framework the host might use.

\`last-comments\` is the self-hosted middle: a complete comment service that owns its data and a set of widgets that can be dropped into any page without giving up the host's design.

## What last-comments is

\`last-comments\` is a self-hosted comment system built on Payload v4, TanStack Start, Bun, and PostgreSQL. The application is both the service and its own first consumer: a blog and documentation site, a Payload admin at \`/admin\`, a moderation dashboard at \`/moderation\`, a public comments API, a generated API reference, and a plugin pipeline all run in the same deployment.

The hosted instance is [last-comments.lst97.dev](https://last-comments.lst97.dev). It is also the service behind the comment thread at the bottom of this page.

## The two repositories

| Repository | Role |
| --- | --- |
| [lst97-oss/last-comments](https://github.com/lst97-oss/last-comments) | The service: Payload CMS, TanStack Start routes, Bun/Drizzle business kernel, moderation dashboard, auth, plugins, docs and blog |
| [lst97-oss/last-comments-widgets](https://github.com/lst97-oss/last-comments-widgets) | The clients: one npm package containing native React, Vue, Angular and plain-HTML widgets on one shared API client and theme |

The split is deliberate. The service can be self-hosted without the widgets, and the widgets can render their own UI against the API; but most hosts install the package and never write a comment component at all. The package is \`@lst97-oss/last-comments-widgets\`, currently at 0.5.0; the service is at 0.2.1.

## What it sets out to do

- **Own the data.** Comments, sites, pages, votes, moderation events, API keys, and commenter sessions live in a PostgreSQL database the operator controls, not in a vendor's account.
- **Serve any page, not one platform.** A comment thread belongs to a URL or a stable page key. The host can be a blog, a documentation site, a project page, or an application screen.
- **Make abuse control part of the default path.** Origin allow-listing, Turnstile, rate limits, block lists, and content screening are installed and enabled rather than left as an integration exercise.
- **Treat moderation as a product surface.** Hiding, deleting, pinning, locking pages, blocking users, and reading the audit trail happen in a dashboard, not in SQL.
- **Ship the client, four times over.** React, Vue, Angular, and plain HTML render the same DOM contract and behaviour, so choosing a framework is not choosing a different comment system.

## Architecture

\`\`\`mermaid
${SYSTEM_DIAGRAM}
\`\`\`

The application is one TanStack Start deployment with two PostgreSQL databases. Payload owns the CMS: admin users, posts, and media, with committed migrations and \`push: false\`. The business database owns everything the comment domain needs: Better Auth users and sessions, sites, allowed origins, pages, comments, votes, blocks, verified users, moderation events, API keys, and the plugin outbox.

That separation is not cosmetic. Payload's adapter and schema stay on the CMS side; the comment service uses a Bun-native SQL client and Drizzle, with its own migrations. A CMS upgrade cannot rewrite comment tables, and a comment migration cannot touch editorial content.

## Identity and tenancy

Commenters authenticate through Better Auth, with three provider modes: \`better-auth\` for Google and the built-in session flow, \`oidc-jwt\` for an external identity provider, and \`header\` for a trusted reverse proxy. The modes can be chained. Public email/password registration stays off; the first account creates the instance admin, and later accounts sign in with a configured provider.

Above the commenter identity sits a small tenancy model:

- An **instance admin** manages sites and API keys.
- A **site membership** is either \`admin\` or \`moderator\` and is scoped to one site.
- A **site key** identifies the tenant to a widget. It is public: it selects a site, it does not authorise an account.
- **API keys** are separate and scoped. Instance keys carry \`sites:create/read/update/delete\`; site keys carry \`pages:read\`, \`pages:write\`, and, deliberately separately, \`pages:delete\`. A write-only key cannot delete a thread.

Moderation never accepts an API key. It is session-only, and \`POST /api/moderation\` is additionally checked against the application origin. A shared key must not be able to impersonate a moderator.

Every site registers its allowed origins. List and write requests answer only an origin registered for that site, with credentialed CORS; a page on a different registrable domain needs a same-origin proxy for signed-in features, because the session cookie is not sent cross-site.

## The comment lifecycle

\`\`\`mermaid
${COMMENT_PIPELINE_DIAGRAM}
\`\`\`

A comment is written through a fixed order. The origin is checked first. Identity is resolved from the session or, for a guest, from a required display name. The operation then passes the rate limiter, Turnstile, and the screening plugins before a row is inserted.

The details that matter:

- **Guests are first-class but bounded.** A guest post receives a one-time edit key; only its hash is stored. The key works for the guest edit window, ten minutes by default, and \`0\` means unlimited. Signed-in authors can edit their own comments at any time.
- **Deletes stay session-only.** There is no edit key for deletion, and no API key path, because deleting is not an identity a shared key should be able to borrow.
- **Votes are one per user per comment.** Casting again switches the vote; clearing it is a separate request. The API returns an aggregate score and the viewer's own vote, never the voter list.
- **Screening can hide, not only reject.** A filter hit inserts the comment with \`status: 'hidden'\` so it can be reviewed. A moderator can restore it; the author sees a hidden state rather than losing the text.
- **Page threads are stable.** The service registers a page by URL and optional \`pageKey\`. The site's own Payload hooks use \`<collection>-<id>\` as the key, so a slug change moves the page without orphaning its thread.

## Moderation

\`/moderation\` is the operator surface. It lists sites and pages, opens a thread with the same widget the public site uses, and stacks the moderation actions beside it: pin, hide, restore, delete, lock the page, and block or verify a user. The dashboard also carries instance stats, a leaderboard, recent activity, API key management, site settings, and takedown history.

Two design choices keep it honest:

- **The thread view uses the real widget.** Markdown, nesting, pinned order, hidden and deleted badges, and the reply composer are the same components a visitor sees. There is no second rendering path that can drift.
- **Every mutation is an event.** Hiding, deleting, pinning, locking, blocking, and verifying write a moderation event with the actor, target, and reason. Deleting a page removes its comments, replies, and votes but keeps the audit record, so the URL and the action remain investigable.

A moderator can also post and reply from the dashboard. That path skips the public origin, guest-name, and Turnstile gates because the session is the verification, while remaining site-scoped and still enforcing page locks and parent visibility.

## Abuse prevention

The defaults are on, not opt-in:

- **Turnstile** verifies every comment, signed-in ones included. Missing or invalid tokens fail with 403; an unavailable verifier fails closed with 503. The widget renders the challenge and matches its light or dark mode to its own theme.
- **Rate limiting** is per site and requester: creates at 5 per 10 minutes, edits and deletes at 20 per 10 minutes, and votes at 60 per minute. Signed-in requests use the user ID; guests use a keyed HMAC of the resolved client IP, so the raw address is never stored. The limiter fails closed with 503 on a database error, and a trusted-ingress check prevents a direct client from rotating \`x-real-ip\`.
- **Content screening** combines a local bad-words engine with an OpenRouter decision model. A hit hides the comment for review rather than rejecting it, and provider failure resolves through a configurable fail-open path instead of blocking every write.
- **Tenant isolation** is enforced before anything else: an unregistered origin gets 403 \`ORIGIN_NOT_ALLOWED\`, and an unknown site gets \`SITE_NOT_FOUND\`. There is no shared global thread namespace.

## The plugin system

Plugins are trusted server-side TypeScript modules, statically imported in \`src/server/plugins/config.ts\`. Installing an npm package does not activate it, and the host never downloads code at runtime. That is a deliberate trade: plugins run with the application's privileges, so activation is a code review, not a checkbox.

The capability surface is small:

- \`validateComment\` runs in order with a five-second timeout, and a failure rejects the write.
- \`beforeOperation\` wraps the public create, edit, delete, and vote boundaries; this is where the rate limiter lives.
- \`screenComment\` returns an advisory \`allow\` or \`hide\` verdict. It never throws the write away.
- \`events\` plus \`handleEvent\` subscribe to domain events. Delivery goes through a transactional outbox, so an event is written in the same transaction as the comment it describes.
- \`migrations\` run only for installed plugins, through the business migration script, never at application startup.

The worker delivers the outbox with bounded retries, exponential backoff, and a dead-letter state. The three installed plugins are Turnstile, rate limiting, and the filter, which is also a worked example of the event and migration halves.

## The public API

The service exposes a small HTTP surface:

| Endpoint | Purpose |
| --- | --- |
| \`GET /api/comments\` | One page of rows for a site and page URL or page key |
| \`POST /api/comments\` | Create a comment or reply, with Turnstile token and guest name when needed |
| \`PATCH /api/comments/:id\` | Edit as the author, or with the guest edit key inside the window |
| \`DELETE /api/comments/:id\` | Delete as the signed-in author |
| \`PUT /api/comments/vote\` | Cast or switch a vote; \`DELETE\` clears it |
| \`/api/admin/pages\` | Register, list, or delete page threads with a scoped key or site session |
| \`/api/moderation\` | Session-only moderation reads and writes |
| \`/api/auth/*\` | Better Auth session and sign-in routes |

Every response is the same envelope: \`{ data }\` on success, \`{ error: { code, message } }\` on failure. The codes are stable strings, which is what lets the widgets render scenario-specific copy without parsing prose. The OpenAPI document is generated and served with a Scalar reference at \`/docs/api-reference\`, and the product documentation is a Fumadocs site in the same application.

## The widgets

\`\`\`mermaid
${WIDGET_PACKAGE_DIAGRAM}
\`\`\`

The package exports one subpath per framework plus the shared client and stylesheets. A consumer installs the package and the libraries for the framework it actually uses; every other framework's libraries are optional peers and are never installed or loaded. Each subpath ships built ESM and a compiled stylesheet, so there is no build step in the host.

The shared client is where the difficult parts live: the fetch wrapper and \`ApiError\`, the error-copy table, a markdown renderer with raw HTML stripped and URL schemes restricted, thread helpers that turn a flat stream into a tree, auth helpers, and the theme-variable mapping. The four widgets are native implementations of the same DOM contract, not wrappers around one framework.

What a host gets without writing a comment component:

- **List, composer, pager, skeletons, and error block**, with a read-only \`CommentViewer\` for pages that show but do not accept comments.
- **Thread-aware pagination.** The API returns a flat stream with no total; a page is a window over top-level threads, replies included. Orphan replies are promoted to roots rather than disappearing.
- **Identity control.** A signed-in viewer can post as themselves or anonymously; a guest posts with a name and Turnstile; the composer stays disabled until the session probe answers, so a comment cannot post with a guessed identity.
- **Markdown with an optional upgrade path.** KaTeX math and Mermaid diagrams are loaded lazily and only when a comment contains one. Shiki code highlighting is currently React-only; the other ports keep plain fenced blocks until they are migrated.
- **Moderation mode.** Passing \`viewerRole\` renders inline actions and posts through \`/api/moderation\`, so the dashboard origin does not need to be in the public site's allow-list.
- **One theme object.** \`themeVars\` covers colours, typography, spacing, radii, shadows, and visibility switches. Styles are scoped with native CSS \`@scope\`, so importing the stylesheet does not reset the host page.
- **Lazy loading.** \`lazy\` defers every request until the widget scrolls into view, for threads below the fold.

## Built on the Payload template

The service started from [last-payload-tanstack-start-template](https://github.com/lst97-oss/last-payload-tanstack-start-template), and the template's decisions are still visible in the running product.

The boot wiring is inherited rather than re-solved: the vendored RSC-independent Payload Vite plugins, the \`withPayloadRoot\` admin shell, the admin bridge and import map, the persisted-search adapter, the production origin guard, and the graceful shutdown hook. The business kernel is the template's kernel extended with real modules: the \`{ data }\` / \`{ error }\` envelope, \`HttpError\` with hidden 5xx messages, \`withContext\` for request IDs and logging, zod parsing at the boundary, one Bun-native Postgres client, and the live/ready split.

That is the strongest argument for the template: a product with its own auth model, two databases, a moderation dashboard, a plugin outbox, and a published client grew out of it without reopening the questions the template had already answered. The work went into the comment domain, not into rediscovering the boot order.

## This site runs on it

The comment thread below this post — and on every other project deep-dive, blog post, and changelog entry — is the React widget from \`@lst97-oss/last-comments-widgets/react\` talking to the hosted \`last-comments\` instance. It is not a third-party embed.

The integration is small on purpose. Payload hooks register each published page with the service and use \`<collection>-<id>\` as the stable page key, so a slug change moves the thread instead of starting a new one. The widget loads lazily in the browser, takes the site's palette through CSS variables, and renders with the same \`themeVars\` contract any other host would use. Deleting a document removes its thread; the service keeps its own audit trail.

## Current status

\`last-comments\` is under heavy development. The core flows work and the hosted instance is live, but the schema, API, and widget surface can still change between releases. If you self-host, pin a release and read the changelog before upgrading.

Bug reports and feature requests are welcome on either repository. Pull requests are not being accepted yet — the core is still moving, and reviewing external patches against a moving schema would waste contributors' time. That will change once the core stabilises.

Both repositories are MIT licensed.

## Repositories

| Repository | What lives there |
| --- | --- |
| [lst97-oss/last-comments](https://github.com/lst97-oss/last-comments) | Service, moderation dashboard, API, auth, plugins, docs, live instance |
| [lst97-oss/last-comments-widgets](https://github.com/lst97-oss/last-comments-widgets) | React, Vue, Angular and vanilla widgets, shared client, theme, examples |

The live instance is [last-comments.lst97.dev](https://last-comments.lst97.dev). The package is [@lst97-oss/last-comments-widgets](https://www.npmjs.com/package/@lst97-oss/last-comments-widgets).
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
    title: 'last-comments',
    summary:
      'A self-hosted comment system for any page: a Payload and TanStack Start service with moderation, site-scoped API keys and a plugin pipeline, plus drop-in React, Vue, Angular and plain-HTML widgets published as one package.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'in_progress' as const,
    // The widgets repository came first; the service followed three days later.
    // No `endDate`: the project is under active development.
    startDate: '2026-10-18T00:00:00.000Z',
    repositoryUrl: 'https://github.com/lst97-oss/last-comments',
    liveUrl: 'https://last-comments.lst97.dev',
    // Not featured: the featured window is taken, and this is an archive row.
    featured: false,
    // Follows last-cli at 11, behind Wat Wat New Zealand at 10.
    sortOrder: 12,
    status: 'published' as const,
    technologies: [
      'TypeScript',
      'Bun',
      'TanStack Start',
      'React 19',
      'Vue 3',
      'Angular 22',
      'Payload CMS 4',
      'PostgreSQL',
      'Drizzle ORM',
      'Better Auth',
      'Cloudflare Turnstile',
      'OpenRouter',
      'Tailwind CSS 4',
      'shadcn/ui',
      'Base UI',
      'Fumadocs',
      'Scalar',
      'Docker Compose',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'last-comments — self-hosted comment threads',
      description:
        'Self-hosted comment threads built with Payload, TanStack Start, Bun and PostgreSQL, with moderation, abuse controls, a plugin outbox, and drop-in widgets for React, Vue, Angular and plain HTML.',
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
