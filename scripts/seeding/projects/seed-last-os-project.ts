/**
 * Seeds the LAST//OS project — the portfolio/CMS/RAG platform served at
 * www.lst97.dev — plus its topics and tags.
 *
 * Follows the same shape as the three sibling project seeds: the Payload local
 * API (never raw SQL, so the collection hooks, the version row and the
 * publication date all apply), Markdown converted with `convertMarkdownToLexical`
 * exactly as the admin's Markdown mode does, and slug-matched upserts so
 * repeated runs never accumulate duplicates.
 *
 * Two deliberate differences from its siblings:
 *
 * 1. It takes the featured-project window at `sortOrder: -2`, outranking G-NAF
 *    at -1. LAST//OS *is* the site the home page links to, so sorting the
 *    portfolio itself below an autocomplete service inverts the priority. G-NAF
 *    moves to 0, which the home loader reads as the next featured row.
 *
 * 2. It is `projectStatus: 'in_progress'`, unlike the three completed siblings.
 *    The repository is public and actively developed, and the write-up lists
 *    unresolved work under "Known Areas for Further Improvement". Marking a
 *    live project as completed would misstate its status on the listing.
 *
 * `startDate` is the repository's first commit (2026-09-21) rather than the
 * date the public repository was created (2026-09-27); there is no `endDate`
 * because the project is not finished.
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

const PROJECT_SLUG = 'last-os'

const TOPICS = [
  {
    slug: 'ai-pipeline',
    title: 'AI Pipeline',
    description: 'Separated model responsibilities: decision, tool-argument planning, and answer generation.',
  },
  {
    slug: 'knowledge-retrieval',
    title: 'Knowledge Retrieval',
    description: 'pgvector search, semantic reranking, relevance gating, and exact-data tools alongside RAG.',
  },
  {
    slug: 'cms-and-content',
    title: 'CMS & Content',
    description: 'Structured editorial content, publishing workflows, and indexing that follows the CMS.',
  },
  {
    slug: 'security-and-abuse',
    title: 'Security & Abuse Prevention',
    description: 'Turnstile, rate limits, signed context, moderation, and fail-closed transactional workflows.',
  },
  {
    slug: 'deployment-and-operations',
    title: 'Deployment & Operations',
    description: 'Configuration as architecture: origins, migrations, container lifecycle, and health checks.',
  },
] as const

const TAGS = [
  { slug: 'open-source', title: 'Open Source', description: 'Self-hostable and reusable by anyone.' },
  {
    slug: 'ai',
    title: 'AI',
    description: 'Language-model behaviour shaped by system design rather than prompt wording.',
  },
  { slug: 'rag', title: 'RAG', description: 'Retrieval-augmented generation over a personally owned corpus.' },
  {
    slug: 'full-stack',
    title: 'Full Stack',
    description: 'One application carrying presentation, CMS, server domain, and deployment.',
  },
  {
    slug: 'security',
    title: 'Security',
    description: 'Controls chosen so a failure is closed rather than merely logged.',
  },
  {
    slug: 'observability',
    title: 'Observability',
    description: 'Operational questions answered from persisted state, not guesswork.',
  },
] as const

/**
 * The runtime surfaces as `flowchart TB`. The original write-up drew this as a
 * boxed ASCII tree; the node order and labels are preserved so the figure says
 * the same thing, now rendered by the shared Mermaid component.
 */
const ARCHITECTURE_DIAGRAM = `flowchart TB
  visitor["VISITOR"] --> ui["LAST//OS DESKTOP UI"]
  ui --> start["TANSTACK START"]
  start --> content["CONTENT DOMAIN"]
  start --> chat["CHAT DOMAIN"]
  start --> contact["CONTACT DOMAIN"]
  content --> payload["PAYLOAD CMS"]
  chat --> jev["JEV · DECISION"]
  chat --> planner["OPENROUTER PLANNER"]
  chat --> responder["OPENROUTER RESPONDER"]
  jev --> tools["BOUNDED READ-ONLY TOOLS"]
  planner --> tools
  tools --> responder
  contact --> email["EMAIL WORKFLOW"]
  payload --> pg["POSTGRESQL · PAYLOAD DB"]
  tools --> knowledge["POSTGRESQL · KNOWLEDGE DB"]
  knowledge --> pgvector["PGVECTOR"]`

const MARKDOWN = `## The idea

Most developer portfolios answer a small set of predefined questions: who are you, what technologies do you use, what have you built, and how can someone contact you. That works for a traditional website, but a real development history contains far more than fits in a navigation menu — projects, technical case studies, blog posts, changelogs, repositories, coding statistics, historical activity, interview answers, architecture decisions, services and pricing, and implementation notes.

I wanted the portfolio to behave less like a brochure and more like an interface into that information. The idea became a portfolio plus a CMS plus a knowledge base plus an AI assistant, which together make a personal operating system.

LAST//OS is that system. It is one Bun application serving three deliberately separated runtime surfaces, and it is the site you are currently reading.

\`\`\`mermaid
${ARCHITECTURE_DIAGRAM}
\`\`\`

## What it delivers

The delivered system covers:

- a desktop-inspired public portfolio, blog, project case studies, changelog, and topics;
- a Payload CMS administration surface for editorial content;
- PostgreSQL-backed content storage with a separate pgvector knowledge database;
- automated content indexing with local document embeddings and cloud query embeddings;
- semantic reranking and an AI relevance gate over retrieved evidence;
- agentic source selection and a bounded read-only tool layer;
- WakaTime coding-statistics integration and a historical coding-activity warehouse;
- GitHub project, contribution, and interview knowledge;
- a source-grounded AI assistant called Zita with streamed responses;
- a structured contact and enquiry workflow with review-before-delivery;
- anti-abuse controls, rate limiting, Turnstile verification, and signed conversation context;
- SEO generation, sitemap, robots and security text files;
- committed database migrations, background job workers, and automated health checks.

## Three runtime surfaces

The application is intentionally divided into three runtime surfaces.

The **public site** contains the homepage, project portfolio, blog, changelog, topics, chat assistant, and contact interface. The experience is presented through a desktop-style operating-system shell rather than a conventional marketing layout.

\`\`\`mermaid
flowchart LR
  public["PUBLIC SITE"] --> pages["HOME · PROJECTS · BLOG · CHANGELOG · TOPICS"]
  public --> zita["ZITA CHAT"] --> contactPage["CONTACT"]
\`\`\`

The **Payload CMS** provides editorial administration for posts, projects, changelogs, media, topics, tags, and the home page. Content can be drafted and published independently from application deployments.

The **server domain** owns systems that must never be pushed into client components: AI chat, retrieval, knowledge indexing, WakaTime, contact processing, email, moderation, observability, SEO, security, storage, and environment validation. This gives the codebase a clear distinction between presentation and server-only responsibilities.

\`\`\`mermaid
flowchart TB
  subgraph server["SERVER DOMAIN"]
    chatd["CHAT"] --> rag["RAG"] --> index["INDEXING"]
    chatd --> contactd["CONTACT"] --> emaild["EMAIL"]
    chatd --> mod["MODERATION"]
    chatd --> obs["OBSERVABILITY"]
    chatd --> seo["SEO"]
    chatd --> sec["SECURITY"]
    chatd --> env["ENV VALIDATION"]
  end
\`\`\`

## Separate operational databases

One of the most important architectural decisions is using **two PostgreSQL databases**.

\`\`\`mermaid
flowchart LR
  lastos["LAST//OS"] --> payloaddb["PAYLOAD DATABASE"]
  lastos --> knowledgedb["KNOWLEDGE DATABASE"]
  payloaddb --> content["POSTS · PROJECTS · MEDIA · USERS · RATE LIMITS · CONTACT STATE"]
  knowledgedb --> vectors["EMBEDDINGS · VECTOR INDEX · GITHUB KNOWLEDGE"]
  knowledgedb --> warehouse["WAKATIME HISTORY · RETRIEVAL DATA · CATALOGUE"]
\`\`\`

\`DATABASE_URL\` handles normal application and CMS data. \`KNOWLEDGE_DATABASE_URL\` is dedicated to retrieval and historical knowledge workloads. The separation prevents the CMS schema and vector/analytics workloads from becoming tightly coupled, and it means the retrieval subsystem can evolve without forcing the editorial database to carry unrelated vector concerns.

## Content architecture and hooks

Projects and articles are managed as structured content rather than hard-coded React objects. A project carries a title, slug, summary, cover image, rich content, gallery, technologies, topics, tags, role, project status, start and end dates, repository and live URLs, publication status, and SEO metadata. This is what lets the same CMS hold detailed engineering case studies for G-NAF, SmartPlay and WWNZ while the frontend stays generic.

Content supports explicit draft and published states, and unauthenticated users can only read published content.

Publishing does more than update a page. Posts and projects contain hooks that connect the CMS to the knowledge system, so the AI knowledge base follows the CMS rather than becoming a separate manually maintained dataset.

\`\`\`mermaid
flowchart TB
  content2["CONTENT UPDATED"] --> hook["PAYLOAD HOOK"] --> job["KNOWLEDGE INDEXING JOB"]
  job --> chunk["CHUNK CONTENT"] --> embed["GENERATE EMBEDDINGS"] --> pgvector2["PGVECTOR"]
\`\`\`

## Zita — the portfolio AI assistant

Zita is not a generic chatbot with the entire website pasted into a prompt. Requests move through an agentic pipeline: validation, rate limit, Turnstile, moderation and scope, source decision, tool planning, knowledge retrieval, response generation, and a streamed answer. Each stage has a specific responsibility.

\`\`\`mermaid
flowchart TB
  msg["VISITOR MESSAGE"] --> validation["VALIDATION"] --> limit["RATE LIMIT"] --> turnstile["TURNSTILE"]
  turnstile --> moderation["MODERATION / SCOPE"] --> decision["SOURCE DECISION"] --> planning["TOOL PLANNING"]
  planning --> retrieval["KNOWLEDGE RETRIEVAL"] --> generation["RESPONSE GENERATION"] --> stream["STREAMED ANSWER"]
\`\`\`

### Separating model responsibilities

Rather than asking one model to make every decision, the system separates model responsibilities.

**Jev** is the decision model. It decides whether a request is in scope, whether it is safe, which knowledge source should be used, whether retrieved evidence appears relevant, and whether the visitor is trying to start a contact workflow. It does not write the visitor-facing response.

The **OpenRouter planner** prepares the arguments needed to call approved tools once Jev has approved a set. The planner cannot add a source Jev did not approve, which keeps tool authority separate from argument generation.

The **OpenRouter responder** writes the final answer. It receives verified conversation context, retrieved evidence, bounded tool results, and the latest visitor message, and is responsible for language and presentation rather than for deciding which sources exist.

\`\`\`mermaid
flowchart TB
  jev2["JEV · DECISION"] --> planner2["OPENROUTER PLANNER"] --> tools2["VERIFIED TOOLS"] --> responder2["OPENROUTER RESPONDER"]
\`\`\`

The simpler alternative — one model deciding, retrieving, reasoning and answering — was deliberately avoided. Separating the roles gives explicit control over source selection and makes the system far easier to debug.

### Read-only tool architecture

The assistant operates through bounded read-only tools rather than arbitrary server execution: knowledge search, the owned project catalogue, current coding statistics, historical coding activity, published site content, and commercial services. Each tool has a fixed schema and validates its own arguments, so the model cannot construct an arbitrary SQL query, filesystem operation or server command.

The tool layer can take multiple steps. A request such as "show me all of your projects and explain the G-NAF one" first retrieves the catalogue, then re-evaluates the requirements against what came back, then retrieves project detail, and only then generates a response — rather than trying to predict every retrieval operation before seeing earlier tool results.

### Project catalogue versus semantic retrieval

Project inventory is handled separately from semantic retrieval, and the distinction matters. A question like "how many repositories do you own?" needs exact catalogue information; answering it through vector search would mean retrieving random matching repositories. Semantic retrieval is not a database counting mechanism. The system therefore separates exact totals from semantic project details, which is an example of choosing the retrieval strategy according to the information need.

## The retrieval pipeline

Retrieval is a multi-stage process rather than a single vector query.

\`\`\`mermaid
flowchart TB
  question["USER QUESTION"] --> embedq["QUERY EMBEDDING"] --> search["PGVECTOR SEARCH"] --> cands["TOP CANDIDATES"]
  cands --> rerank["SEMANTIC RERANKER"] --> top["TOP EVIDENCE"] --> gate["JEV RELEVANCE GATE"] --> ctx["RESPONDER CONTEXT"]
\`\`\`

Vector distance alone does not necessarily identify the best passage, so candidates are reranked through a dedicated semantic reranking stage before they become answer evidence. A separate relevance decision then runs before evidence reaches the responder, which reduces the risk of merely retrieving text that is vector-similar but not actually useful.

**Embeddings are split by workload.** Document indexing uses a local \`llama-server\` embedding endpoint running Qwen3-Embedding-0.6B, which keeps bulk ingestion independent of a per-document cloud API. Query embeddings are handled separately and may use SiliconFlow, because online query latency and operational simplicity matter differently than bulk ingestion.

\`\`\`mermaid
flowchart LR
  docs["DOCUMENTS"] --> local["LOCAL EMBEDDINGS"]
  questions["QUESTIONS"] --> cloud["CLOUD QUERY EMBEDDINGS"]
  local --> vectors2["PGVECTOR"]
  cloud --> vectors2
\`\`\`

**Evidence is treated as untrusted data.** Retrieved knowledge is never treated as system instructions, because a portfolio may contain Markdown, source code, copied documentation, repository content, and visitor-controlled text, any of which could contain instruction-like text. Retrieval output, tool results, conversation history and visitor input are all wrapped as data. This is part of the prompt-injection defence.

The indexed corpus is broader than the visible website: Payload posts and projects, developer profile information, GitHub repository and contribution reports, interview Q&A, service documentation, and WakaTime-derived information.

**RAG is optional.** Retrieval is controlled by \`KNOWLEDGE_RAG_ENABLED\` and disabled by default, so the public website does not depend on the retrieval stack being available. The site does not require a local model server just to render normal content. This keeps optional AI infrastructure from becoming a hard dependency for the core product.

## Background knowledge jobs and CMS-to-RAG automation

Knowledge indexing runs through Payload's job system. An \`indexKnowledgeSource\` job accepts a post or project and processes it for retrieval, with failures retried using exponential backoff, and a scheduled knowledge-sync job keeps sources aligned over time.

\`\`\`mermaid
flowchart TB
  changed["CONTENT CHANGED"] --> queue["QUEUE KNOWLEDGE JOB"] --> idx["INDEX"] --> success{"SUCCESS?"}
  success -->|yes| done["DONE"]
  success -->|no| retry["RETRY WITH BACKOFF"]
\`\`\`

The practical consequence is that publishing a project makes it answerable by the assistant without manually updating a separate chatbot knowledge document.

## WakaTime and the coding-activity warehouse

Coding activity is split rather than treated as one source. Live aggregate statistics come from WakaTime's public JSON shares, while historical activity is imported into the knowledge database as a warehouse. That allows questions about time spent on a project, activity across a date range, trends, and streaks without making every assistant request depend on a live third-party API.

The assistant can also state the warehouse's coverage period rather than implying imported data is live. Current numbers and imported history answer different questions, so they are served by different sources.

## Contact workflow

The assistant can transition into a structured contact process. This is deliberately **not** implemented as a model sending email. The visitor request is screened for contact intent, confirmed explicitly, filled into a structured form, screened again, reviewed, and only then delivered — and the application, not the language model, performs the actual send.

\`\`\`mermaid
flowchart TB
  req["VISITOR REQUEST"] --> intent["CONTACT INTENT"] --> confirm["EXPLICIT CONFIRMATION"] --> form["STRUCTURED FORM"]
  form --> screening["SCREENING"] --> review["REVIEW"] --> approve["USER CONFIRMS EXACT CONTENT"]
  approve --> claim["ONE-TIME DELIVERY CLAIM"] --> smtp["SMTP DELIVERY"]
\`\`\`

Contact mode is an explicit state machine — template selection, filling, review, delivered — and cannot silently fall back into normal chat mid-submission. This keeps AI conversation state and transactional email state separate.

### Review before delivery

For structured bug reports and feature requests, the model may refine the submitted content, but the refined result is never sent automatically. The visitor reviews both the original and the refined submission before approving, and a signed proof binds the approved content to the final send. Without that binding, a later model call could silently change what the user approved.

### Duplicate-send protection

The final delivery flow uses a persistent one-time approval claim in PostgreSQL, so a retry or duplicate confirmation cannot send the same approved submission twice. The system deliberately avoids an in-memory fallback, because that would fail under process restarts or multiple instances.

## Anti-abuse controls

Public AI and contact endpoints are attractive automation targets, so several controls are layered rather than relying on one.

\`\`\`mermaid
flowchart TB
  subgraph controls["LAYERED CONTROLS"]
    c1["INPUT VALIDATION"]
    c2["RATE LIMITING"]
    c3["CLOUDFLARE TURNSTILE"]
    c4["SEMANTIC MODERATION"]
    c5["TOOL RESTRICTIONS"]
    c6["TIME LIMITS"]
  end
  c1 & c2 & c3 & c4 & c5 & c6 --> protected["PROTECTED ENDPOINT"]
\`\`\`

**Moderation** is also treated as an engineering problem. Jev classifies chat scope, chat safety, contact intent, contact safety, and template fit, and the system fails closed when a high-risk classification cannot be resolved confidently. At the same time the thresholds are calibrated to avoid blocking legitimate enquiries, which is a deliberate balance between false positives and false negatives.

**Rate limiting** uses separate budgets for chat and contact. That separation matters because screening a contact submission can cost two model calls, so leaving it on the chat bucket would make the most expensive path the cheapest to drive.

**Signed conversation context** means server state sent to the browser is HMAC-signed. The client cannot edit trusted server context and send it back, and only verified context may influence trusted workflow state.

**Bounded AI operations** are explicit: tool timeouts, provider timeouts, and a maximum chat stream duration, so neither a model provider nor a retrieval service can leave a visitor request hanging indefinitely.

## Streaming and safe error presentation

Chat responses are delivered as streamed events rather than waiting for one complete JSON response, so the interface stays responsive while preserving typed server/client boundaries. The stream can carry tool progress, tool result summaries, generated response chunks, workflow transitions, and errors.

Raw server exceptions are never shown to visitors. The application keeps a bounded set of authored user-facing failure messages, and unexpected transport or implementation errors collapse to safe generic output rather than leaking provider details, stack information, or internal exception messages. This matters most on a streaming endpoint, where browser and network exceptions — a torn-down stream rejects a reader with a literal "Error in input stream" in Chromium — would otherwise reach the interface verbatim.

## Chat observability

When configured, a restricted diagnostics channel receives structured information about a turn: request identifier, model decisions, retrieval candidates, provider-reported usage, response status, and bounded visitor metadata.

It deliberately excludes cookies, credentials, signed context tokens, contact form contents, and raw sensitive exceptions. Observability is designed to debug model routing without becoming another unrestricted data sink. Provider-reported usage is preserved exactly and never inferred.

## CMS, security, and storage

Payload CMS is embedded through the TanStack Start integration and manages users, media, posts, projects, changelogs, topics, tags, and the home page, which makes this a publishing platform rather than a code-only portfolio.

Several CMS defaults were tightened deliberately:

- **GraphQL disabled.** Nothing here needs Payload's GraphQL API, so an unused schema introspection and query surface is removed rather than exposed.
- **Relationship depth limited** to five, because the application does not need deeply recursive relationships and deeper population would increase request cost for no benefit.
- **User creation disabled** on the public API. This is a single-operator CMS; allowing public registration would turn an editorial backend into a registration system.
- **Login attempt protection** — five failed attempts trigger a ten-minute lock, reducing online password-guessing exposure.

Media is stored through an S3-compatible adapter, currently Cloudflare R2, and the integration is enabled only when the appropriate environment configuration is present.

## Configuration as architecture

Several configuration values are treated as part of the architecture rather than documentation.

**SEO** metadata is part of the content model, and the application generates canonical URLs, Open Graph metadata, \`sitemap.xml\`, \`robots.txt\`, and \`security.txt\`. The public origin comes from \`PUBLIC_SITE_URL\` at build time. If the wrong domain is compiled into SEO metadata the site still looks correct while search engines receive incorrect canonical URLs, so origin configuration is deployment correctness, not branding.

**Payload's \`serverURL\`** is a security property because Payload derives cookie and CORS behaviour from it. The application validates the configured CMS origin and refuses a localhost, HTTP-only, or invalid absolute production URL, failing early rather than booting insecurely.

**Environment validation** happens centrally at boot rather than at the first real user request, so a missing credential is discovered before it becomes a production incident.

**Database migrations** are committed and applied explicitly rather than pushed automatically, and development runs a migration check so unregistered schema changes cannot quietly become normal local state.

## Deployment

Vercel is the primary production target, running TanStack Start through Vite and Nitro on Bun, with migrations able to run as part of the deployment build when explicitly enabled. If migration fails the deployment fails, which prevents shipping code that expects a schema that never reached production.

\`\`\`mermaid
flowchart TB
  deploy["DEPLOY"] --> gen1["GENERATE PAYLOAD TYPES"] --> gen2["GENERATE ADMIN IMPORT MAP"] --> migrate["APPLY MIGRATION"] --> build["BUILD APPLICATION"]
\`\`\`

A standalone Docker path also exists, using a multi-stage Bun build with a slim base, separately installed production dependencies, a non-root \`bun\` user, and a health check against \`/api/site/health\` performed by Bun itself to avoid a \`curl\` or \`wget\` dependency in the runtime image.

\`\`\`mermaid
flowchart TB
  dockerstart["CONTAINER STARTS"] --> dockermigrate["APPLY MIGRATIONS"] --> nitro["START NITRO SERVER"]
\`\`\`

The Docker flow migrates on **container startup** rather than image build, and this differs from the Vercel lifecycle on purpose. A Docker image may be built long before it actually starts, so migrating only at build time could leave the image stale by the time it boots.

## Testing strategy

The suite covers far more than React components: AI tool routing, moderation, prompt contracts, retrieval, knowledge providers, embedding processes, services corpus consistency, chat event contracts, contact workflows, security behaviour, CMS integration, migrations, SEO, and Turnstile.

Several tests intentionally pin architectural constraints. Tool outputs are bounded so a tool cannot silently exceed the context budget the responder expects, and prompt sizes are measured rather than allowed to grow indefinitely.

**Context budget is treated as a finite engineering resource.** Tool output is deliberately truncated before reaching the responder, and rather than raising the limit whenever a tool grows, the expectation is that tool contracts stay concise.

\`\`\`mermaid
flowchart LR
  raw["RAW SOURCE"] --> structured["STRUCTURED TOOL"] --> bounded["BOUNDED OUTPUT"] --> responder3["RESPONDER"]
\`\`\`

## Engineering decisions

**Portfolio as a system, not a static site.** The objective was not merely to display projects but to connect projects, writing, coding history, repositories, services and AI into one system.

**CMS instead of hard-coded content.** Projects and articles change far more often than application architecture, so keeping them in Payload means editorial updates do not require frontend code changes.

**Modular monolith instead of microservices.** CMS, chat, retrieval, contact, WakaTime, SEO, storage and moderation all remain inside one application because none currently requires an independent scaling boundary. Modules are separated by responsibility without paying the operational cost of distributed services.

**Two databases instead of one huge schema.** CMS storage and vector/analytics storage have different responsibilities, and separating them creates a cleaner boundary while keeping deployment relatively simple.

**Local embeddings where practical.** Bulk document indexing runs through local inference rather than paying for every document through an external API, while cloud services remain useful where online latency and operational simplicity matter.

**A dedicated decision model.** Source selection is a classification problem and answer generation is a language-generation problem; using one model interaction for both would be simpler, but separating the responsibilities creates clearer authority boundaries.

**Retrieval instead of prompt stuffing.** The system never injects the entire portfolio, GitHub history and WakaTime history into a request. Only information selected as relevant is retrieved, which reduces token usage, latency, irrelevant context and conflicting evidence while letting the corpus keep growing.

**Exact-data tools alongside semantic retrieval.** Vector search suits fuzzy knowledge questions and is the wrong tool for "how many projects are there?", so semantic retrieval is combined with structured exact-data tools.

**AI as an interface, not a database.** The language model is not the source of truth. Authoritative information remains in Payload, PostgreSQL, pgvector, WakaTime data, GitHub reports and service definitions; the AI layer retrieves and presents it.

**Fail closed around transactional workflows.** Contact delivery, moderation and signed state transitions prefer rejection over an unverified action — a missing approval claim means do not send, rather than send anyway.

## What I learned

The main lesson is that adding AI to a product is relatively easy, while building an AI feature that can be reasoned about operationally is much harder. A basic chat integration is user, model, answer. This project required thinking about scope, safety, source selection, retrieval quality, tool permissions, context size, timeouts, streaming, state verification, observability, external provider failure and transactional actions.

**AI reliability is mostly system design.** Reliability is often improved through better source boundaries, tool schemas, retrieval, reranking, smaller prompts, explicit state machines, structured validation and deterministic guards, rather than by switching to a larger model.

**Retrieval quality matters more than corpus size.** More documents do not automatically produce better retrieval. A useful system must answer which corpus should be queried, which candidates are actually relevant, which source is authoritative, and whether this is a semantic question or an exact-data question. The introduction of separate catalogue tools, reranking and relevance gating came directly from this problem.

**Production configuration is part of architecture.** Public origin, database TLS configuration, Payload server URL, deployment migration mode and secret storage can make an otherwise correct application fail or become insecure in production, so deployment configuration became part of the design rather than documentation added afterwards.

## Result

LAST//OS started as a personal developer portfolio and became a platform combining portfolio, CMS, AI assistant, retrieval, GitHub knowledge, coding analytics, contact workflows, object storage and production infrastructure. The public experience is still a portfolio; the underlying system behaves much more like a small product platform.

Its defining characteristic is not any individual framework or AI model. It is the way the system keeps content, authoritative data, retrieval, AI decisions, user-facing generation, transactional workflows and production operations separated into explicit responsibilities — which lets the site keep growing without turning the AI layer into the source of truth, or the application into a collection of tightly coupled model calls.
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
    title: 'LAST//OS',
    summary:
      'The portfolio platform behind www.lst97.dev: a desktop-styled public site, a Payload CMS, and a server domain running retrieval-augmented generation, an agentic AI assistant, GitHub and WakaTime knowledge, and a structured contact workflow.',
    role: 'Designer, engineer, and operator',
    // Not `completed` like the three sibling seeds: the repository is public and
    // the write-up lists unresolved work under "Known Areas for Further
    // Improvement". There is deliberately no `endDate`.
    projectStatus: 'in_progress' as const,
    startDate: '2026-09-21T00:00:00.000Z',
    repositoryUrl: 'https://github.com/lst97-oss/last-lst97-dev',
    liveUrl: 'https://www.lst97.dev',
    // The home loader takes the first `featured` project by `sortOrder`, so this
    // must outrank every other featured row: LAST//OS *is* the site the home
    // page links to, so listing it below an autocomplete service inverts the
    // priority. G-NAF at -1 becomes the next featured row.
    featured: true,
    sortOrder: -2,
    status: 'published' as const,
    // `technologies` is a Payload array field, so each entry is a row object
    // with a `technology` key rather than a bare string.
    technologies: [
      'TypeScript',
      'Bun',
      'TanStack Start',
      'React 19',
      'Payload CMS 4',
      'PostgreSQL 18',
      'pgvector',
      'Tailwind CSS 4',
      'Vite 8',
      'Nitro 3',
      'OpenRouter',
      'TypeSafe Jev',
      'SiliconFlow',
      'Qwen3-Embedding-0.6B',
      'Zod',
      'Cloudflare Turnstile',
      'Cloudflare R2',
      'Vercel',
      'Docker',
      'Biome',
    ].map((technology) => ({ technology })),
    topics: topicIds,
    tags: tagIds,
    content,
    seo: {
      title: 'LAST//OS',
      description:
        'The portfolio platform behind www.lst97.dev — a desktop-styled site, a Payload CMS, and a retrieval-augmented AI assistant with agentic source selection and a structured contact workflow.',
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
  const blockCount = children.filter(
    (node) => typeof node === 'object' && node !== null && 'type' in node && node.type === 'block',
  ).length

  console.log(`\nProject ${current ? 'updated' : 'created'}: ${saved.slug} (id ${saved.id})`)
  console.log(`  rich-text blocks: ${blockCount}`)
  console.log(`  topics: ${topicIds.length}, tags: ${tagIds.length}`)
  console.log('  Note: the afterChange hook enqueued an indexKnowledgeSource job for the knowledge worker.')

  await payload.db.destroy?.()
}

await main()
process.exit(0)
