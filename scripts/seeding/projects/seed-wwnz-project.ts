/**
 * Seeds the Wat Wat New Zealand (WWNZ) project, its topics, and its tags.
 *
 * Sibling to `seed-gnaf-project.ts` and `seed-smartplay-project.ts` and
 * deliberately identical in shape: the
 * Payload local API, a Markdown literal converted with
 * `convertMarkdownToLexical`, and slug-keyed upserts so repeated runs never
 * accumulate duplicates.
 *
 * The ASCII-art blocks in the original write-up are Mermaid flowcharts here.
 * ` ```mermaid ` fences become Lexical `Code` blocks tagged
 * `language: 'mermaid'`, which is exactly what
 * `src/components/site/content/rich-text.tsx` keys on to render a diagram
 * instead of a code listing.
 *
 * This is a PRIVATE repository, so unlike its two siblings it sets neither
 * `repositoryUrl` nor `liveUrl`: both resolve to a 404 for an anonymous
 * visitor, and the article describes a private, allowlisted application rather
 * than something offered publicly.
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

const PROJECT_SLUG = 'wat-wat-new-zealand'

const TOPICS = [
  {
    slug: 'financial-logic',
    title: 'Financial Logic',
    description: 'Balances, settlement calculation, and money-handling rules that must stay correct.',
  },
  {
    slug: 'data-synchronisation',
    title: 'Data Synchronisation',
    description: 'Two-way state reconciliation, stable identity, and conflict detection across systems.',
  },
  {
    slug: 'external-integrations',
    title: 'External Integrations',
    description: 'Owning an upstream third-party service: contract boundaries, credentials, and failure modes.',
  },
] as const

const TAGS = [
  {
    slug: 'spreadsheet-integration',
    title: 'Spreadsheet Integration',
    description: 'Working inside a shared spreadsheet that stays editable outside the application.',
  },
  {
    slug: 'multi-currency',
    title: 'Multi-Currency',
    description: 'Converting between currencies without rewriting history at the current rate.',
  },
  {
    slug: 'optimistic-concurrency',
    title: 'Optimistic Concurrency',
    description: 'Rejecting a stale write instead of silently overwriting someone else’s work.',
  },
  {
    slug: 'authentication',
    title: 'Authentication',
    description: 'Identity, sessions, and access control in front of a private application.',
  },
  {
    slug: 'media-lifecycle',
    title: 'Media Lifecycle',
    description: 'Deciding when an uploaded file is orphaned and safe to delete.',
  },
] as const

/** The original write-up drew this as a boxed ASCII tree; node order and labels are preserved. */
const ARCHITECTURE_DIAGRAM = `flowchart TB
  user["USER"] --> ui["REACT UI"]
  ui --> start["TANSTACK START"]
  start --> trpc["tRPC"]
  trpc --> transactions["TRANSACTIONS"]
  trpc --> settlements["SETTLEMENTS"]
  trpc --> dashboard["DASHBOARD"]
  transactions --> logic["BUSINESS LOGIC"]
  settlements --> logic
  dashboard --> logic
  logic --> drizzle["DRIZZLE"]
  drizzle --> sqlite[("SQLITE")]
  logic --> sheets["GOOGLE SHEETS API"]
  drizzle --> rates["EXCHANGE RATES"]
  drizzle --> media["MEDIA STATE"]
  media --> uploadthing["UPLOADTHING"]`

/**
 * Reading in and writing back out to a spreadsheet other people can also edit.
 * The two halves are the reason this project is more than a CRUD app: the write
 * path has to respect columns the application does not own, and the read path
 * has to reject a save built on a row someone else has since changed.
 */
const SHEETS_SYNC_DIAGRAM = `flowchart TB
  subgraph readpath["READ"]
    sheet["SHEET ROW"] --> mapping["COLUMN MAPPING"]
    mapping --> validation["VALIDATION"]
    validation --> members["MEMBER RESOLUTION"]
    members --> currency["CURRENCY PARSING"]
    currency --> record["TRANSACTION RECORD"]
  end
  subgraph writepath["WRITE"]
    update["TRANSACTION UPDATE"] --> editable["EDITABLE-FIELD MAPPING"]
    editable --> safe["FORMULA-SAFE RANGES"]
    safe --> batch["BATCH UPDATE"]
  end
  record --> conflict{"FINGERPRINT UNCHANGED?"}
  conflict -->|"yes"| batch
  conflict -->|"no"| reject["ASK USER TO REFRESH"]`

/**
 * Choosing which underlying debt records a partial settlement covers. The exact
 * subset search is only affordable while the candidate set is small, so the
 * algorithm switches strategies rather than letting combinatorial cost grow
 * without bound.
 */
const SETTLEMENT_SELECTION_DIAGRAM = `flowchart TB
  debts["CANDIDATE DEBT RECORDS"] --> credits["APPLY CREDITS FIRST"]
  credits --> count{"CANDIDATE COUNT"}
  count -->|"small"| exact["EXACT COMBINATIONAL SEARCH"]
  count -->|"large"| greedy["GREEDY SELECTION"]
  greedy --> improve["LOCAL IMPROVEMENT"]
  exact --> rank["RANK BY FEWER RECORDS"]
  improve --> rank
  rank --> cover["LOWER OVER-COVERAGE"]
  cover --> indirect["FEWER INDIRECT RECORDS"]
  indirect --> deterministic["DETERMINISTIC TIE-BREAK"]
  deterministic --> selected["SELECTED DEBT RECORDS"]`

const MARKDOWN = `## The problem

Splitting a bill looks trivial. Someone pays HKD 800 for four people, each owes HKD 200, done.

A real shared ledger stops being trivial almost immediately.

Different people pay for different things, and each expense covers a different subset of the group. Some are paid in HKD and others in NZD, exchange rates move between transactions, and people repay partially.

One person can owe money on one expense while being owed money on another. Receipts need attaching. Several people edit the same record.

At that point a spreadsheet is still genuinely useful — it is transparent, everyone can read it, and it works without an account — but the business rules needed on top of a shared ledger stop being maintainable as formulas.

Wat Wat New Zealand does not replace the spreadsheet. It adds a structured, authenticated application beside it, and treats keeping the two consistent as the core engineering problem rather than a migration detail.

## What it delivers

- **Authentication:** Google OAuth behind an email allowlist
- **Expenses:** multi-member splitting, receipt and evidence uploads, dashboard analytics
- **Currencies:** HKD and NZD with historical exchange rates
- **Balances:** automatic member balances and settlement suggestions
- **Settlements:** records with partial payments, credit handling, and intelligent selection of which debt records a payment covers
- **Google Sheets:** two-way synchronisation, concurrent-edit protection, and formula-safe spreadsheet writes
- **Operations:** automated orphaned-media cleanup

## Architecture

One deployable, clear boundaries: TanStack Start hosting React and server functions, tRPC carrying a typed API to the browser, business logic below that, and Drizzle owning a SQLite file. Google Sheets is an active integration reached through a service boundary, not an import step.

\`\`\`mermaid
${ARCHITECTURE_DIAGRAM}
\`\`\`

SQLite is a deliberate choice, not a shortcut. The expected deployment is a small trusted user group, a single application instance, and a moderate dataset. SQLite gives transactional storage, trivial backups, and no separate database service to operate — and the application can move to PostgreSQL later if concurrency or scale ever demonstrate the need, rather than introducing one pre-emptively.

## Google Sheets as a live integration

The spreadsheet stays editable outside the application. That is the point: it keeps familiar manual access, transparent raw data, and compatibility with how the group already works.

It also means synchronisation is a first-class engineering concern rather than a one-time import.

Raw rows carry a wide set of columns — ID, payer, beneficiaries, date, amount, currency, exchange rate, base-currency amount, payment method, per-person share, settlement state, media, and a row UUID.

Those are mapped, validated, resolved to members, parsed for currency, and normalised into application records. Invalid or incomplete rows are skipped rather than allowed to propagate malformed external data through the whole application.

All Sheets access runs through authenticated tRPC procedures backed by a Google service account, so the browser never holds Google credentials and the privileged read, write, append, clear, and list operations stay server-side.

## Two problems that shape the whole update path

**Stable identity.** Spreadsheet row numbers are not identifiers. Rows get inserted, deleted, reordered, and sorted, so treating "row 23" as "transaction 23" breaks silently. The application maintains a transaction UUID alongside the visual row number, and there is tooling to backfill missing UUIDs into existing rows. Identity survives sorting; the row position does not.

**Formula-safe writes.** Not every column belongs to the application — some hold spreadsheet formulas or calculated values that a generic whole-row overwrite would destroy. An explicit transaction-sheet column contract maps editable fields to the specific ranges the application owns, and updates are issued as batch updates restricted to those ranges. The application stays a good citizen inside a data source it does not exclusively control.

\`\`\`mermaid
${SHEETS_SYNC_DIAGRAM}
\`\`\`

## Rejecting stale writes instead of overwriting

With two editing surfaces, last-write-wins quietly destroys work. Someone can open a transaction in the application while the same row is edited directly in Google Sheets, and the first save would then overwrite the newer state.

WWNZ generates a fingerprint from the editable transaction state at load time, and regenerates it from the current spreadsheet state at save time. If the two differ, the save is rejected and the user is asked to refresh. That is optimistic concurrency control applied across an external spreadsheet, and it is why editing a transaction here is closer to a synchronisation problem than a local form submission.

## Balances and settlement calculation

A transaction records more than an amount and a person. If Alice pays HKD 900 for herself, Bob, and Carol, her individual share is HKD 300 — she consumed HKD 300 of it and contributed HKD 900, so her net contribution is +HKD 600 while Bob and Carol each owe HKD 300.

Aggregating those relationships across transactions produces member balances. A negative balance owes money, a positive balance is owed money, and balances become settlement suggestions like "Bob → Alice, HKD 320.00" so nobody has to reconstruct the position from hundreds of individual expenses.

Settlements are recorded separately from debts on purpose: money owed and money actually paid are different facts. Keeping both lets the system distinguish outstanding debt, historical debt, settled and unsettled totals, partial repayment, and credit already applied.

## Selecting which records a payment covers

Recording "paid HKD 820" loses the traceability of which expenses that payment resolved. The system instead associates a settlement with the underlying debt records, so it can still determine what remains outstanding afterwards.

Choosing that subset is the interesting part. Given available debts of 420, 300, 180, 150, and 90, and a payment of HKD 570, the search has to weigh record count, over-coverage, and direct versus indirect records.

For small candidate sets it runs an exact combinational search ranked on those criteria with deterministic tie-breaking. Once the candidate set is large enough that exhaustive search becomes expensive, it switches to greedy selection plus local improvement rather than letting combinatorial cost grow without bound.

\`\`\`mermaid
${SETTLEMENT_SELECTION_DIAGRAM}
\`\`\`

## Credits, currencies, and historical rates

A relationship between two members is not always pure debt. If Bob owes Alice HKD 500 and Alice owes Bob HKD 120, Bob's effective position is HKD 380. The settlement system therefore supports credit records that are applied against debt before deciding how much actual payment is needed, and the interface exposes the debt subtotal, the automatically applied credit, previously applied credit, the net amount, and the balance remaining after payment.

Transactions keep their original currency while also carrying a HKD base value for group accounting. Using today's rate for an expense from three weeks ago would quietly distort every settlement, so the exchange-rate service stores history in both directions and supports date-specific lookup — falling back to the most recent earlier rate when no exact daily rate exists. Historical transactions are never re-valued at the current market rate.

## Authentication and access control

This is a private application, not a public registration platform. Authentication is Better Auth with Google OAuth, email/password disabled, and access restricted through an \`ALLOWED_EMAILS\` configuration — possession of a Google account alone does not grant access.

The allowlist is checked at more than one stage: new user creation, OAuth callbacks, and newly created sessions. If an unauthorised user somehow reaches session creation, the session is removed before access is retained, so a frontend redirect is never the only security boundary. Sessions are persisted through the Drizzle adapter with a seven-day expiry, periodic database refresh, and short-lived cookie caching, which keeps protected routes server-aware rather than treating authentication as client-side state.

## Uploads and media lifecycle

Transactions and settlements can carry receipt and payment-confirmation images. Uploads go through UploadThing behind an authenticated session check — image type, 8 MB maximum, one file per upload — so anonymous clients cannot use the storage endpoint.

Adding object storage raises the question of what happens when a transaction is deleted or a receipt is replaced. Without cleanup, files become orphaned and stay forever. The application keeps media snapshots in SQLite to track references across synchronisation, compares them against the active media URLs in the sheet, and deletes what is genuinely unreferenced.

Destructive background jobs need more than a read does, so cleanup supports:

- Dry-run mode
- A minimum retention age
- A per-run deletion cap
- Single-run locking
- Batch deletion with per-file fallback when a batch fails
- Authenticated manual triggering

Each run reports rows scanned, orphaned files found, files deleted, deletion failures, and files skipped for age.

## Tech stack

- **Frontend:** React 19, TanStack Start, TanStack Router, TanStack Query, tRPC, React Hook Form, Tailwind CSS 4, Recharts, Base UI
- **Backend:** TanStack Start server functions, tRPC, Zod, Bun
- **Database:** SQLite with Drizzle ORM and Drizzle Kit
- **Authentication:** Better Auth, Google OAuth, email allowlisting
- **External integrations:** Google Sheets API, exchange-rate API, UploadThing
- **Quality:** Vitest, Testing Library, Biome, TypeScript
- **Infrastructure:** Docker, Docker Compose, GitHub Actions, GitHub Container Registry, Tailscale, Cloudflare Tunnel

## Testing, deployment, and operations

Tests cover Sheets synchronisation, transaction editing, conflict fingerprints, settlement creation and editing, settlement detail, media cleanup, and the financial business logic. Settlement code in particular is tested deterministically and independently of the UI, because a financial-calculation regression does not fail loudly — it silently produces the wrong amount of money.

Container builds run on pushes, pull requests, and tags, publishing to GitHub Container Registry with build caching. Production deployment is a separate workflow that reaches the private server over Tailscale rather than exposing administrative SSH, pulls the image, and applies database migrations. Migrations distinguish a fresh install from an existing one, and an existing install stops the old container before migrating, which avoids SQLite locking during deploy.

Deployment secrets come from GitHub Secrets and are written as a permissions-restricted runtime \`.env\` on the target server rather than committed. Backups are timestamped copies of the SQLite file, restored by replacing it and restarting. Cloudflare Tunnel provides HTTPS termination without exposing the application port directly.

## What this project demonstrates

The most valuable part of Wat Wat New Zealand is not any individual framework. It is that integrating an existing system turned out to be harder than replacing it.

If the application only used its own database, transaction editing would be straightforward. Because the spreadsheet stays editable, the application has to reason about identity, ownership, synchronisation, formulas, and concurrent changes — which turns an ordinary CRUD operation into a distributed state-consistency problem, even though the application itself is small.

Financial software also became complicated through edge cases rather than scale: partial settlement, existing credit, which original records a payment covered, an expense denominated in NZD, which historical rate applies, and someone editing the spreadsheet while a form is open. The architecture grew around making each of those states explicit rather than implicit in a formula.

That is the through-line — a small split-bill tool became a systems problem because it had to keep financial correctness, synchronisation, and traceability intact at the same time.
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
    title: 'Wat Wat New Zealand',
    summary:
      'A private full-stack expense and settlement platform that keeps a shared Google Sheets ledger and an application database consistent — stable transaction identity, conflict-fingerprint write protection, formula-safe spreadsheet updates, multi-currency balances, and partial settlement with credit handling.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'completed' as const,
    startDate: '2026-02-28T00:00:00.000Z',
    endDate: '2026-03-04T00:00:00.000Z',
    // No `repositoryUrl` and no `liveUrl`: the repository is private and the
    // deployment is reachable only through an allowlisted, tunneled host. Both
    // would render as a dead link to a visitor.
    featured: false,
    // Below the demo block's start (90) and above nothing else, so the row lands
    // directly after SmartPlay in the listing without touching the featured
    // window the home loader reads.
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
      'tRPC',
      'Bun',
      'SQLite',
      'Drizzle ORM',
      'Better Auth',
      'Zod',
      'Google Sheets API',
      'UploadThing',
      'Recharts',
      'Tailwind CSS',
      'Docker',
      'GitHub Actions',
      'Cloudflare Tunnel',
      'Tailscale',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'Wat Wat New Zealand',
      description:
        'A private expense and settlement platform keeping a shared Google Sheets ledger and an application database consistent, with multi-currency balances, partial settlement, and conflict-protected writes.',
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
