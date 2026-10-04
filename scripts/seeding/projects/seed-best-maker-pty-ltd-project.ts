/**
 * Seeds the Best Maker Pty Ltd project, its topics, and its tags.
 *
 * Sibling to `seed-gnaf-project.ts`, `seed-smartplay-project.ts`,
 * `seed-last-os-project.ts` and `seed-wwnz-project.ts` and deliberately
 * identical in shape: the Payload local API, a Markdown literal converted with
 * `convertMarkdownToLexical`, and slug-keyed upserts so repeated runs never
 * accumulate duplicates.
 *
 * The ` ```mermaid ` fences in the Markdown below become Lexical `Code` blocks
 * tagged `language: 'mermaid'`, which is exactly what
 * `src/components/site/content/rich-text.tsx` keys on to render a diagram
 * instead of a code listing. The diagrams are transcribed from the project's
 * own architecture notes.
 *
 * Two deliberate differences from its siblings:
 *
 * 1. It is `projectStatus: 'in_progress'`. The brief states the product is
 *    "Active and in production. The stack runs continuously", so marking it
 *    completed would misstate a live product — the same reason LAST//OS is
 *    `in_progress` and unlike the three finished siblings. There is no
 *    `endDate` for the same reason.
 *
 * 2. It sets `liveUrl` but no `repositoryUrl`. The public site is the product's
 *    front door; all five source repositories are private, so a source link
 *    would render as a 404 to a visitor.
 *
 * `startDate` is the earliest repository-creation date across the five private
 * repositories in the project's GitHub organisation (2025-12-27).
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

const PROJECT_SLUG = 'best-maker-pty-ltd'

const TOPICS = [
  {
    slug: 'quotation-and-invoicing',
    title: 'Quotation and Invoicing',
    description: 'Quotation revisions, acceptance, document numbering, and turning an accepted quote into an invoice.',
  },
  {
    slug: 'commerce-and-orders',
    title: 'Commerce and Orders',
    description: 'Catalog, cart, checkout, and reconciling a store order with the finance pipeline.',
  },
  {
    slug: 'service-boundaries',
    title: 'Service Boundaries',
    description: 'Splitting slow, bursty, or independently failing work out of the business core.',
  },
] as const

const TAGS = [
  {
    slug: 'openapi-contract',
    title: 'OpenAPI Contract',
    description: 'A published API contract with a generated client and a CI drift gate.',
  },
  {
    slug: 'split-payments',
    title: 'Split Payments',
    description: 'Settling one invoice across several instalments over the life of a job.',
  },
  {
    slug: 'signed-service-calls',
    title: 'Signed Service Calls',
    description: 'Authenticated, time-stamped requests between internal services so a leaked one cannot be replayed.',
  },
  {
    slug: 'payment-reconciliation',
    title: 'Payment Reconciliation',
    description: 'Matching imported bank transactions against invoices and expenses.',
  },
  {
    slug: 'role-based-access-control',
    title: 'Role-Based Access Control',
    description: 'Server-side permissions across the dashboard, CMS and admin surfaces, not UI-only gating.',
  },
  {
    slug: 'token-scoped-links',
    title: 'Token-Scoped Links',
    description: 'A share link that opens exactly one document without granting an account.',
  },
] as const

/**
 * The four bands the product is read in: who calls it, the edge in front of it,
 * the application tier, and the background tier that does the slow work.
 */
const ARCHITECTURE_DIAGRAM = `flowchart TB
  subgraph clients["Clients"]
    visitor["Visitor / Client"]
    team["Internal Team"]
  end
  edge["Edge Network + TLS"]
  subgraph application["Application"]
    web["Web App<br/>site + CMS + dashboard"]
    api["API Server<br/>business core"]
    shop["Commerce Backend<br/>catalog, cart, orders"]
  end
  subgraph background["Background"]
    services["Internal Services<br/>documents, email, workers, jobs, backups"]
    flows["Workflow Automation"]
  end
  data[("Data Layer")]
  files[("Object Storage")]
  visitor --> edge
  team --> edge
  edge --> web
  edge --> shop
  edge --> flows
  web -->|"typed client generated from the contract"| api
  web --> shop
  api -->|"authenticated service calls"| services
  api --> flows
  web --> data
  api --> data
  shop --> data
  services --> data
  web --> files
  api --> files
  services --> files`

/**
 * The split rule, stated as a diagram: what stays in the core, and what leaves
 * it. Everything extracted shares a trait — slow, bursty, or independently
 * failing.
 */
const BOUNDARY_RULE_DIAGRAM = `flowchart TB
  work["Candidate work"] --> same["Same failure and<br/>scaling profile?"]
  same -->|"yes"| core["Stays in the<br/>business core"]
  same -->|"no"| split["Split into an internal service"]
  split --> slow["Slow?<br/>render, export"]
  split --> bursty["Bursty?<br/>batch, scheduled"]
  split --> flaky["Independently failing?<br/>relay, browser"]
  slow --> queue["Enqueued behind an outbox"]
  bursty --> queue
  flaky --> signed["Reached only by signed,<br/>time-stamped internal calls"]`

/**
 * How a client-facing document is produced without a request ever waiting on a
 * headless browser.
 */
const DOCUMENT_PIPELINE_DIAGRAM = `flowchart TB
  doc["Quotation or invoice"] --> fp["Fingerprint of content,<br/>profiles and document settings"]
  fp --> cached{"Fingerprint matches<br/>the stored object?"}
  cached -->|"yes"| reuse["Reuse the stored PDF"]
  cached -->|"no"| outbox["Append render intent<br/>to the outbox"]
  outbox --> worker["Background worker renders"]
  worker --> store[("Store the PDF<br/>in object storage")]
  store --> deliver["Email, or a token-scoped<br/>public share link"]`

const MARKDOWN = `## The problem

A project-based maker business has an awkward shape. The public side needs to look credible — a portfolio, a services page, a way for a client to browse products and enquire. The private side needs to be boring and exact: measure the job, price it, issue a formal quotation, take a deposit, track costs, reconcile the bank, and produce a PDF invoice and receipt presentable enough to send to a client.

Most tools solve one of these halves. A CMS solves the site. A generic invoicing tool solves the invoice. A shop template solves neither the bespoke-job workflow nor the accounts that come with it. The result is a business that retypes the same customer data five times and reconciles by hand.

This product closes that gap with one data model per real-world entity — customer, company profile, address, payment method, quotation, invoice, expense, income, transaction, product, order — and one application that presents each of them in the form that fits its audience: a storefront page, a dashboard, or a PDF.

## What it does

### Public site and content

- Marketing homepage with services, product highlights, featured projects, social proof and an enquiry form.
- **Project portfolio** — case studies published and curated through a CMS, with media galleries, categories and tags.
- **Blog** and SEO metadata, sitemap, and Open Graph handling generated from content.
- **Service pages** and a public contact/enquiry flow, protected against automated abuse.
- Token-gated **public document links** so a client can open exactly one invoice or quotation without an account.

### Quote to cash

- **Quotations** with line items, automatic totals, revisions, and status tracking from draft through acceptance.
- **Invoices** with line items, document numbering, and **split payments** — a single invoice settled in several instalments.
- **PDF generation** for both documents, rendered on demand and cached by content so an unchanged document is never re-rendered or re-uploaded.
- **Delivery** of documents by email, plus public share links.

### Money in, money out

- **Expense capture and approval** — submit, review, approve or reject, with category-level reporting.
- **Income tracking** across revenue categories.
- **Monthly statistics** — spending and revenue broken down by category and month.
- **Bank sync and reconciliation** — import transactions from the connected accounting account and reconcile them against invoices and expenses.
- **Spreadsheet sync** — a two-way bridge to a spreadsheet so the business can still hand a copy of the books to whoever asks.

### E-commerce

- **Product catalog** and product detail pages served from the commerce backend.
- **Cart and checkout**, including pickup-location handling and payment.
- **Customer accounts** — the commerce layer delegates authentication to the same identity system as the rest of the app, so there is one login, not two.
- **Order handling** — orders created in the commerce backend carry invoice metadata back into the finance pipeline, so a store purchase and a bespoke job are reconciled the same way.

### Company and team administration

- **Company profiles** — company details, address profiles, payment profiles and document/PDF settings, so issued documents always carry the right letterhead and bank details.
- **Staff members** with roles, and role-based access control across the dashboard and CMS.
- **Invitations** so a new staff member can claim their access.
- **Notifications** generated by business events rather than sent ad hoc.
- **Backup administration** — automated, scheduled database backups with retention tiers, and restore from the admin surface.

### Automation

- **Workflow automation** for the glue work: enquiry routing, scheduled jobs and third-party integrations.
- **Background workers** that drain an outbox, so slow side effects never block a user-facing request.
- **Scheduled maintenance** — retention pruning and orphan-file cleanup.

## Architecture

The product is developed and shipped as independent repositories, wired together at deploy time. Each has its own CI, its own release cadence and its own owner.

| Repository | Role |
| --- | --- |
| \`web\` | Public site, CMS, and the internal dashboard |
| \`server\` | The business core: identity, finance, documents, integrations |
| \`ecommerce\` | Commerce: catalog, cart, orders, customers |
| \`micro\` | Internal services: document rendering, email relay, workers, jobs, backups, automation |
| \`deploy\` | Deployment configuration and CI/CD for the whole stack |

\`\`\`mermaid
${ARCHITECTURE_DIAGRAM}
\`\`\`

Data lives in a relational store, plus object storage for uploaded media and rendered documents. The commerce backend additionally uses a cache and event bus.

## The single most interesting piece

The web app does **not** hand-write its API calls. The API server publishes an OpenAPI contract, and the typed client used by the frontend is **generated** from it at build time. A committed generated client plus a CI drift check means a breaking change to the API fails the build rather than the browser. The contract, the client, and the code that uses it cannot silently disagree.

That matters more than usual here, because the API returns exactly the structures where a silently undefined field is worst: invoices with line items and split-payment instalments, quotation revisions, customer and company profile data, and commerce orders carrying invoice metadata. If the server stops returning a field, the type at the call site changes and the compile fails at the place that reads it — instead of a total quietly disappearing from an invoice.

## The boundary that matters

The business core is a monolith on purpose. Expenses, invoices, quotations and profiles are one tightly-coupled domain, and splitting them would buy nothing: they are read together, written together, and reasoned about together, so a transaction spanning them stays an ordinary database transaction rather than a saga.

What *is* split out is everything that is **slow, bursty, or independently failing**.

\`\`\`mermaid
${BOUNDARY_RULE_DIAGRAM}
\`\`\`

A PDF render can take thirty seconds; a headless browser can die; a mail relay can be down for an afternoon. None of those should be able to take the dashboard with them. So rendering, email delivery, background workers, scheduled jobs and backups run as separate services behind authenticated service-to-service calls.

Every internal service is **internal only**. None is published to the internet, none accepts public traffic, and the reverse proxy does not route to them at all. Each call is signed and time-stamped so a leaked request cannot be replayed.

## Documents

Both quotations and invoices are rendered to PDF. They are rendered **on demand** rather than on every save, and the work is enqueued rather than performed inline, so no request ever waits on a headless browser.

The rendered artefact is then cached by content.

\`\`\`mermaid
${DOCUMENT_PIPELINE_DIAGRAM}
\`\`\`

A fingerprint of the line items, totals, numbering, company details, address profile, payment profile and document settings decides whether the stored PDF is still valid. Matching fingerprint means the existing object is reused — not re-rendered, and not re-uploaded. Changing the company's registered address changes every document issued afterwards, which is exactly why the profile data is part of the fingerprint.

Delivery is by email and by public share link. The share link is **token-scoped**: it grants access to one document, not to an account, so a client can open exactly the invoice they were sent and nothing else.

## Split payments

A bespoke job is not paid in one go. There is a deposit for materials, milestones during construction, and a balance on completion. An invoice can therefore be settled across several instalments, each with its own status. The invoice knows its total, the instalments know what has been requested and what has arrived, and the balance is what remains.

A deposit is simply the first instalment, which is why accepting a quotation that specifies a deposit percentage produces an invoice whose opening instalment is that percentage — without special-casing the concept anywhere.

Acceptance **converts** the quotation into an invoice rather than copying it by hand, so line items and profile references carry across because they are references to the same records. That is what stops the classic drift where a quotation and its invoice disagree about the total or the address.

## Reconciliation

Money coming out is where drift accumulates. So expenses are not merely recorded but submitted, reviewed, and approved or rejected; income is tracked across revenue categories; and monthly statistics are **derived** from those records rather than accumulated into a separate monthly table, which is why closing a month is not an operation.

Bank transactions are imported from the connected accounting account and reconciled against invoices and expenses. Because instalments are first-class records, a transaction can be matched to a specific instalment rather than to an invoice as a whole — which is what makes a deposit, a partial payment and an overpayment distinguishable instead of all collapsing into "this customer owes some money". An unmatched difference is a real signal rather than rounding noise.

A two-way spreadsheet bridge keeps the books exportable. Two-way is the difficulty: other people edit that spreadsheet outside the application, so the write path respects columns the application does not own and the read path rejects a save built on data someone else has since changed. Record identity is maintained alongside the visual row position, because row numbers are not identifiers — rows get inserted, deleted, reordered and sorted.

## A base workflow

1. **Discovery** — the client lands on the public site and browses services, products and featured projects.
2. **Inquiry** — they submit the enquiry form. It is abuse-protected, stored, routed to the team, and raises a notification.
3. **Consultation** — the job is measured and the scope agreed. Company, address, payment and document settings are already on file, so pricing uses real data.
4. **Quotation** — created with line items, reviewed and sent. The PDF is rendered on demand and emailed, and a public token link is generated.
5. **Confirmation** — on acceptance the quotation converts into an invoice and a deposit is requested. Split payments let the balance be collected over the life of the job.
6. **Execution** — expenses, materials and time are captured and approved; income is recorded; bank transactions are imported and reconciled.
7. **Close-out** — the final invoice is issued, documents are delivered, and the numbers flow into the monthly statistics and the spreadsheet bridge.
8. **Aftercare** — the project is published to the portfolio through the CMS. Backups run on a schedule, retention prunes old data, and stray files are cleaned up.

A storefront purchase follows the same spine from step 4 onward.

## Deployment

Production is a containerised stack orchestrated with Docker Compose and deployed by CI on push to a long-lived branch.

- **Images** are built per repository and published to a container registry on every merge to the deploy branch.
- **Deploy order is explicit** — internal services come up first, then the application tier, so the API server never starts against a service that is not ready.
- **One public entry point.** TLS terminates at the edge; a reverse proxy inside the network routes to the site, the API, the commerce backend and the automation tier. Internal services are not routed at all.
- **Configuration is injected, never baked in.** Secrets and per-service settings are generated into environment files at deploy time from the CI secret store, so no credential is ever committed or embedded in an image.
- **Data lives in named volumes** with automated, scheduled backups and tiered retention, and a restore path exercised from the admin surface.
- **CI gates every merge** with lint, typecheck, build, tests, and an OpenAPI client drift check, so a contract break is caught before it ships.

## Security and privacy posture

- **One identity system.** Authentication lives in the API server; the web app and the commerce backend delegate to it. Commerce sessions are issued by the same authority as dashboard sessions.
- **Role-based access control** on the dashboard, the CMS and the admin surfaces, with server-side enforcement rather than UI-only gating.
- **Signed service-to-service calls** for every internal API, with per-service secrets and request signing.
- **CSRF protection, rate limiting, security headers, and a strict Content Security Policy** in front of the public site; enquiry forms are additionally protected against automated submissions.
- **Secrets live only in environment variables** supplied by the CI secret store. No credential is in the repository or in an image.
- **Token-scoped public documents** — a share link grants access to one document, not to an account.

## Status

Active and in production. The stack runs continuously; changes ship through the CI/CD path described above.

## License

Proprietary. All rights reserved.
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
    title: 'Best Maker Pty Ltd',
    summary:
      'The operating system behind a custom fabrication and joinery business — a quote-to-cash pipeline with split payments, bank reconciliation, a commerce back-office, and PDF documents delivered over token-scoped public links.',
    role: 'Designer, engineer, and operator',
    projectStatus: 'in_progress' as const,
    // The earliest repository-creation date across the five private
    // repositories in the project's organisation. No `endDate`: the product is
    // described as active and in production, so a completion date would
    // misstate it.
    startDate: '2025-12-27T00:00:00.000Z',
    liveUrl: 'https://www.bestmaker.com.au',
    // No `repositoryUrl`: all five source repositories are private, so a source
    // link would render as a dead link to a visitor.
    featured: true,
    // Takes the second featured slot. LAST//OS holds -2 because it *is* this
    // site; the home loader takes featured projects in `sortOrder` order.
    sortOrder: -1,
    status: 'published' as const,
    // `technologies` is a Payload array field, so each entry is a row object
    // with a `technology` key rather than a bare string.
    technologies: [
      'Next.js',
      'Payload CMS',
      'Tailwind CSS',
      'TanStack Query',
      'Deno',
      'Hono',
      'Prisma',
      'PostgreSQL',
      'Medusa',
      'Redis',
      'n8n',
      'Docker Compose',
      'GitHub Actions',
      'Caddy',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'Best Maker Pty Ltd',
      description:
        'A fabrication and joinery business platform combining a quote-to-cash pipeline with split payments, a commerce back-office, and contract-gated API boundaries.',
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
