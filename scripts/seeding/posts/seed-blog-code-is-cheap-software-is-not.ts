/**
 * Seeds the "Code Is Cheap. Software Is Not." blog post plus its topics.
 *
 * Argues code is cheap but software is not: AI multiplies implementation while architecture, security, and maintainability stay engineering work.
 *
 * Tags are inline rows on the posts collection, not a vocabulary
 * collection, so only topics are upserted. Idempotent: matched by slug
 * and updated in place.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const POST_SLUG = 'code-is-cheap-software-is-not'

const TOPICS = [
  {
    slug: 'ai-assisted-development',
    title: 'AI-Assisted Development',
    description: 'Designing, constraining, and reviewing AI-assisted implementation work.',
  },
  {
    slug: 'software-engineering',
    title: 'Software Engineering',
    description: 'Architecture, reliability, and maintainability of production software.',
  },
] as const

const MARKDOWN = `### Why hire a software developer when AI can build your website?

A few years ago, building software required a significant amount of manual work.

Developers searched GitHub for examples, read API documentation, looked through Stack Overflow posts, debugged applications line by line, configured servers manually, wrote deployment scripts, and spent hours understanding why two package versions refused to work together.

Today, an AI coding agent can perform a surprising amount of that work.

It can generate components, implement APIs, write database queries, create tests, inspect browser output, read documentation, review pull requests, analyse logs, and even help diagnose deployment failures.

So there is an obvious question:

> If AI can build software, why should a business still hire a software developer?

My answer is simple:

> **Code is cheap. Software is not.**

AI has dramatically reduced the cost of producing code.

It has not removed the need to engineer reliable software.

---

### Software Development Before AI

Before modern coding agents, implementing even a relatively small feature could involve a long chain of manual research.

If I wanted to integrate a new library, I might:

1. Read its documentation.
2. Search GitHub for examples.
3. Find Stack Overflow discussions about common problems.
4. Discover that some of those answers were already outdated.
5. Compare package versions.
6. Experiment with different implementations.
7. Debug failures.
8. Finally write the production implementation.

Debugging itself was often slow.

You might place breakpoints throughout the application, inspect variables one by one, trace execution paths and gradually narrow the problem down until you found the real cause.

Deployment was another discipline entirely.

Creating a Dockerfile or Docker Compose configuration meant understanding things such as:

- Linux permissions
- filesystem layout
- environment variables
- container networking
- ports
- build stages
- runtime selection
- persistent storage
- reverse proxies

Once deployed, debugging might mean SSHing into the server, checking logs manually and trying to reproduce the issue.

For someone still learning full-stack development, deployment alone could consume an entire day.

Testing also had a very real opportunity cost.

On small personal projects, developers sometimes skipped extensive automated testing because manually creating and maintaining those tests could take almost as long as implementing the feature itself.

Shipping the feature often won.

---

## What AI Changed

My workflow today is completely different.

I use AI primarily as a productivity multiplier.

In many projects, AI now writes a large percentage of the implementation. But that does not mean I need to understand less.

In many ways, I need to understand **more**.

The job has shifted upward.

Instead of spending most of my time typing implementation code, I increasingly spend my time on:

- system design
- requirements
- architecture
- reviewing proposed solutions
- choosing dependencies
- security
- deployment
- testing strategy
- maintainability
- communicating with clients
- evaluating trade-offs

Three years ago, an LLM might have generated a useful code snippet.

Today we have coding agents, MCP integrations, reusable skills, CLI tools, browser automation, repository access and agent harnesses that can participate across much more of the development lifecycle.

Tasks that once required hours of searching documentation can sometimes be reduced to minutes of investigation and review.

That changes what the developer is responsible for.

The developer becomes less of a code typist and more of a **technical decision-maker**.

---

## Why Vibe Coding Works

I do not think vibe coding is inherently bad.

It is extremely useful when the scope is small and the objective is clear.

For example:

- prototypes
- MVPs
- landing pages
- personal websites
- internal tools
- small automations
- proof-of-concept applications
- validating a business idea

This may actually be one of AI's biggest contributions to software development.

A business owner can describe an idea and quickly get something interactive instead of spending weeks producing specifications and mock-ups.

A client can click a real button, navigate between pages and immediately understand what the proposed product might feel like.

That feedback is valuable.

The problem starts when a prototype quietly becomes a production system.

---

## "It Works" Is Not the Same as "It Is Engineered"

A non-developer naturally focuses on the visible result.

Does the button work?

Does the form submit?

Can the customer make a booking?

Can I see the dashboard?

Those questions matter.

But they are only part of software engineering.

An engineer also asks:

- What happens when the request fails?
- Is the user authorised to perform this action?
- Is input validated on the server?
- Can one customer access another customer's data?
- What happens if the request is submitted twice?
- What happens when there are 100 users? 10,000?
- Can this feature be changed later without rewriting everything?
- Who owns this business rule?
- Where should this logic live?
- What happens during a migration?
- How are backups handled?
- What happens when a dependency stops being maintained?
- Can another developer understand this code six months from now?

The visible feature might be identical.

The engineering underneath it can be completely different.

---

## The 4,000-Line Website Problem

One pattern I frequently see with AI-generated projects is that the application technically works, but its structure becomes increasingly difficult to maintain.

A prompt such as:

> Build my business website.

can result in one enormous HTML, CSS or JavaScript implementation containing thousands of lines.

For a small demonstration, that may be perfectly acceptable.

But then the owner asks for:

- authentication
- bookings
- payments
- an administration panel
- email notifications
- customer accounts
- analytics
- multiple roles

Now the original architectural decisions matter.

When responsibilities were never separated properly, every new feature introduces more coupling.

Two utility functions start solving the same problem differently.

Pages use slightly different colours.

Validation exists in one form but not another.

Business logic appears in both frontend and backend code.

Old scripts remain in the repository.

Unused dependencies accumulate.

Documentation stops matching the implementation.

The application still runs.

But changing it becomes progressively more expensive.

Eventually you reach the point where fixing two small problems requires refactoring a significant part of the system.

That is technical debt.

AI can generate technical debt much faster than humans ever could.

---

## What Developers Actually Add

When I start a serious application, I do not begin by telling AI:

> Build the entire system.

I establish constraints.

Depending on the application, that might include:

- a defined project structure
- separation of concerns
- typed API contracts
- schema validation
- ORM usage
- consistent response structures
- reusable UI components
- automated type generation
- appropriate automated tests
- domain boundaries where they provide value
- clear ownership of business logic

I also try to avoid giant files and split components and services according to their responsibility and scope.

The objective is not to apply every design pattern simply because it exists.

The objective is to create enough structure that the system can continue evolving.

That distinction is important.

Engineering is not about making software complicated.

Good engineering often means preventing accidental complexity.

---

## Security Is Where the Difference Becomes More Serious

Security is one of the areas where inexperienced vibe coding can become dangerous.

Authentication is a good example.

A developer will generally prefer a mature, widely reviewed authentication system rather than inventing a custom authentication mechanism without a strong reason.

We think about questions such as:

- Which endpoints require authentication?
- Which endpoints require authorisation?
- Are permissions checked server-side?
- How are sessions handled?
- How are passwords or tokens stored?
- What input needs validation?
- What data should never reach the client?
- Are secrets exposed?
- What happens when the user changes roles?

Many of these protections are invisible when everything works normally.

That makes them easy to miss when your only success criterion is:

> The feature works.

The same applies to payments, customer data, migrations, backups and infrastructure.

The more valuable the system becomes, the more expensive these invisible mistakes become.

---

## AI Does Not Remove Engineering Judgment

AI is very good at recommending a reasonable implementation.

But AI usually does not own the long-term product vision.

You do.

This is where software engineers use AI differently.

When AI asks:

> Would you like to implement option A or option B?

the important skill is no longer simply knowing how to write either implementation.

The important skill is understanding what each decision means six months later.

AI often proposes a low-risk local solution.

That solution may be perfectly reasonable for today's task while creating much more refactoring for tomorrow's feature.

A person without the broader architectural context may simply accept the recommended choice.

An engineer is more likely to ask:

- What are we building next?
- Does this decision constrain us later?
- Are we introducing unnecessary coupling?
- Is this dependency healthy?
- Does this match the rest of our architecture?
- Is there a simpler long-term approach?

That judgment is where much of the developer's value has moved.

---

## AI Still Needs Guardrails

I also do not give AI unrestricted control over production systems.

My preference is to maintain separate environments such as:

- development
- pre-production or staging
- production

AI can operate much more freely in development and staging.

Production requires tighter controls.

Coding agents can make mistakes.

I have experienced cases where Git operations around conflicts caused untracked work to disappear. Experiences like that make me much more conservative around repository operations, deployment and production infrastructure.

Secrets are another important boundary.

An AI agent should not automatically receive unrestricted access to \`.env\` files or production credentials.

When AI-assisted operations are required, I prefer concepts such as:

- least-privilege access
- restricted credentials
- temporary credentials where possible
- read-only log access
- staging before production
- reviewed deployment changes

AI can make DevOps dramatically more efficient.

That does not mean giving an autonomous agent unrestricted root access to your infrastructure is a good engineering practice.

---

## Dependencies Still Need Human Review

AI's knowledge can also lag behind the ecosystem.

It may suggest:

- an abandoned package
- an older API
- a library with declining community support
- a dependency that no longer matches the project's stack

When AI introduces an important dependency, I usually check:

- whether it is actively maintained
- recent releases
- community adoption
- documentation quality
- compatibility
- whether the project actually needs another dependency

AI can recommend the library.

The developer owns the consequences.

---

## Why Businesses Still Hire Developers

A business is not primarily paying a software engineer to type code.

It is paying them to:

> **communicate with the client, understand the problem, make technical decisions, and deliver a secure, readable and maintainable solution.**

That includes identifying requirements the client may not yet realise they have.

A good developer helps transform:

> "I need a booking system."

into questions such as:

- Who can create a booking?
- Can bookings overlap?
- Are there different staff calendars?
- What happens when someone cancels?
- How far in advance can customers book?
- Are payments required?
- Is there an approval process?
- Are reminders required?
- Which timezone controls availability?
- What data must be retained?
- Who has permission to view customer information?

Those questions often matter more than the React component that displays the calendar.

---

## The Future of Software Development

I do not think AI means software developers disappear.

I think the definition of software development is changing.

Pure implementation skill is becoming less scarce.

The valuable skills are moving toward:

- understanding problems
- architecture
- debugging
- security
- communication
- product thinking
- technical judgment
- integration
- deployment
- maintenance
- ownership

AI lowers the barrier to creating software.

That is a good thing.

More people can experiment.

More founders can validate ideas.

More developers can work across disciplines.

Smaller teams can build things that previously required much larger teams.

But generating an application and engineering a reliable system are still different problems.

That is why my view of modern software development can be summarised in two sentences:

> **Vibe coding lowers the cost of creating software, but not the cost of engineering reliable software.**

> **Code is cheap. Software is not.**`

async function upsertVocabulary(
  payload: Payload,
  collection: 'topics',
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

    if (typeof saved.id !== 'number') throw new Error(collection + ' ' + entry.slug + ' did not return a numeric id')
    ids.push(saved.id)
    console.log('  ' + collection + ': ' + entry.slug + ' (' + (doc ? 'updated' : 'created') + ')')
  }

  return ids
}

async function main() {
  const payload = await getPayload({ config })

  const posts = payload.config.collections.find((collection) => collection.slug === 'posts')
  const contentField = posts?.fields.find(
    (field): field is RichTextField => field.type === 'richText' && 'name' in field && field.name === 'content',
  )
  if (!contentField) throw new Error('The posts collection has no richText content field')

  const editorConfig = editorConfigFactory.fromField({ field: contentField })
  const content = convertMarkdownToLexical({ editorConfig, markdown: MARKDOWN })

  const topicIds = await upsertVocabulary(payload, 'topics', TOPICS)

  const data = {
    slug: POST_SLUG,
    title: 'Code Is Cheap. Software Is Not.',
    excerpt:
      'AI has made code cheap to produce; engineering — architecture, security, maintainability — is what businesses still pay developers for.',
    tags: ['AI', 'Vibe Coding', 'Architecture', 'Security'].map((tag) => ({ tag })),
    topics: topicIds,
    status: 'published' as const,
    publishedAt: '2026-10-01T09:00:00.000Z',
    content,
    seo: {
      title: 'Code Is Cheap. Software Is Not.',
      description:
        'AI has made code cheap to produce; engineering — architecture, security, maintainability — is what businesses still pay developers for.',
    },
  }

  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: POST_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const current = existing.docs[0]
  const saved = current
    ? await payload.update({ collection: 'posts', id: current.id, data, overrideAccess: true })
    : await payload.create({ collection: 'posts', data, overrideAccess: true })

  console.log('\nPost ' + (current ? 'updated' : 'created') + ': ' + saved.slug + ' (id ' + saved.id + ')')
  console.log('  topics: ' + topicIds.length)
  console.log('  Note: the afterChange hook enqueued an indexKnowledgeSource job for the knowledge worker.')

  await payload.db.destroy?.()
}

await main()
process.exit(0)
