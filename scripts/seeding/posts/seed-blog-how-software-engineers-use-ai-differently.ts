/**
 * Seeds the "How Software Engineers Use AI Differently From Vibe Coders" blog post plus its topics.
 *
 * Contrasts engineer-led AI use — decomposition, constraints, review loops — with whole-system vibe coding.
 *
 * Tags are inline rows on the posts collection, not a vocabulary
 * collection, so only topics are upserted. Idempotent: matched by slug
 * and updated in place.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const POST_SLUG = 'how-software-engineers-use-ai-differently'

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

const MARKDOWN = `AI coding tools are available to almost everyone.

A business owner can open a coding agent and ask:

> Build me a booking system.

A software engineer can use exactly the same model.

But the results can be dramatically different.

The difference is not necessarily that the engineer knows some secret prompt.

The difference is the thinking that happens **before, during and after the prompt**.

---

## AI Is Not Just a Code Generator

I mainly use AI to write implementation code, investigate bugs and accelerate work that I already understand conceptually.

For me, AI is a productivity multiplier.

It can help with:

- brainstorming
- architecture discussions
- implementation
- refactoring
- debugging
- testing
- documentation
- SQL
- DevOps
- research
- pull-request review
- browser testing

That is very different from treating AI as:

> "Here is my idea. Build everything for me."

The value comes from cooperation.

AI handles more implementation.

I spend more time determining **what should be implemented and why**.

---

## From Coding to Orchestration

My old workflow was much more sequential.

I would research something, understand it, implement it, debug it and then move to the next task.

Today the workflow can be more parallel.

While one coding agent implements a defined feature, I can:

- research the next requirement
- review another pull request
- design an upcoming feature
- talk to the client
- investigate deployment
- prepare another agent's task

The engineer increasingly becomes an orchestrator of technical work.

This does not mean blindly running as many agents as possible.

The work still needs boundaries.

The smaller and clearer an agent's responsibility is, the easier its output is to review.

---

## The Difference Starts With Problem Decomposition

Consider two people building the same booking system.

A non-developer might start with:

> Build me a booking system.

An engineer is more likely to decompose the problem.

The conversation might start closer to:

> I am building a booking system for this type of business. It needs reservations, availability, time-slot selection, cancellations and staff management. Let's define the domain and data model first.

Then we review the proposed design.

What entities exist?

Perhaps:

- User
- Customer
- StaffMember
- Service
- Location
- AvailabilityRule
- Booking
- BookingStatus
- Payment

Then we ask more questions.

Can two services have different durations?

Can one employee provide multiple services?

Can multiple employees share a resource?

Can bookings overlap?

What timezone is authoritative?

What happens when availability changes after a booking already exists?

That discussion shapes the database and domain model.

Only after those decisions are reasonably stable should implementation expand.

---

## Do Not Ask AI to Solve the Entire System at Once

One of the most important skills when using coding agents is controlling scope.

Instead of:

> Build authentication, bookings, payments, email reminders and the dashboard.

I would rather work through bounded pieces.

For example:

1. Define the booking domain.
2. Design the persistence model.
3. Review constraints and indexes.
4. Implement the booking service.
5. Add validation.
6. Add authentication boundaries.
7. Expose the API.
8. Add the UI.
9. Add tests around important behaviour.
10. Integrate notifications.
11. Test the workflow end to end.

The exact order depends on the product.

I also would not say that every application should always be database-first. Some products benefit from starting with user flows, APIs or domain modelling.

The important point is **deliberate decomposition**.

AI performs much better when the engineer converts one huge ambiguous problem into a sequence of bounded problems.

That was an important software engineering skill before AI.

AI has made it even more important.

---

## A Developer Has a Picture in Their Head

One of the biggest differences between vibe coding and engineering is context.

An experienced developer usually has a mental picture of where the project is heading.

We may already know that next month we need:

- multiple organisations
- different permission levels
- payment processing
- audit logs
- a mobile application
- external integrations

That future affects today's decisions.

Suppose AI recommends a quick implementation that stores everything directly against a single user.

That may be fine for the feature you asked for today.

But if you know multi-tenant organisations are coming next month, you may reject it.

A person without that broader context may select whichever solution AI labels "recommended."

This is why AI can produce perfectly valid code while still pushing a project in the wrong architectural direction.

The local implementation is correct.

The global decision is wrong.

---

## Engineers Constrain AI

When I use AI on a serious project, I establish conventions.

Depending on the application, these might include:

- TypeScript
- strict typing
- Zod schemas
- generated API types
- ORM usage
- reusable response contracts
- shared UI primitives
- consistent error handling
- clear feature boundaries
- automated testing
- documented architecture

I may use ideas from DDD or TDD where they actually solve a problem, but I do not believe every project needs every methodology.

Patterns should solve complexity, not create it.

The goal is consistency.

If each AI session invents its own architecture, your repository becomes a collection of individually reasonable but collectively inconsistent solutions.

---

## Readability Matters More When AI Writes the Code

One interesting consequence of AI coding is that I care even more about project structure.

Why?

Because I may not personally type most of the implementation.

The codebase itself needs to communicate structure.

A well-organised project helps both humans and AI understand where behaviour belongs.

I prefer:

- feature-focused modules
- explicit responsibilities
- small components
- reusable shared abstractions
- predictable naming
- limited file size
- minimal duplication

I use file size as a warning signal rather than an absolute rule.

If a file approaches hundreds or thousands of lines, I ask whether it contains multiple responsibilities that should be separated.

This becomes especially important with agents, because AI is perfectly capable of continuing to add another 500 lines to an already oversized file if nobody tells it not to.

---

## AI Changed Debugging

Debugging is one of the areas where AI has changed my workflow the most.

Previously I would:

- reproduce the issue
- add breakpoints
- inspect variables
- read logs
- follow the call path
- narrow down the failure

That still matters.

But AI can investigate much faster.

Modern coding agents can sometimes use headless browsers, inspect DOM state, execute workflows and analyse application output themselves.

For UI and integration problems, I can describe what I suspect:

> I think this state is being overwritten after the request completes.

The agent can inspect the related code paths and either confirm or reject my hypothesis.

That reduces investigation time dramatically.

The important part is that I still need to evaluate whether the fix makes sense.

Fast debugging is not useful if the fix simply moves the bug somewhere else.

---

## AI Makes Testing Economically Different

Automated tests used to have a much higher implementation cost.

For personal or non-commercial projects, developers sometimes skipped tests because manually writing and maintaining them slowed feature delivery.

AI changes that calculation.

Generating tests is relatively cheap.

Updating them is relatively cheap.

Running them remains cheap.

That means it becomes practical to maintain much stronger regression coverage even on smaller projects.

I still would not generate hundreds of brittle tests around a UI that is changing every day.

Tests have maintenance costs even when AI writes them.

But once important behaviour becomes stable, AI makes it easier to cover:

- business rules
- API contracts
- validation
- permissions
- edge cases
- integration paths
- regressions

This is particularly useful because AI agents sometimes modify behaviour outside the exact area you intended them to change.

Tests become an important boundary around the agent.

---

## SQL Is a Good Example of AI Multiplying Skills

SQL is not my strongest area.

AI is often substantially faster than me at:

- creating queries
- inspecting relationships
- identifying missing indexes
- constructing migrations
- testing assumptions

That does not mean I give it unlimited database access.

For normal application code, I still prefer an ORM where it improves maintainability and readability.

If basic CRUD can be expressed clearly through the ORM, I would rather not introduce raw SQL unnecessarily.

For specialised reporting or performance-sensitive queries, raw SQL may still be appropriate.

The engineer's job is choosing the right abstraction.

AI handles much of the syntax.

---

## Code Review Becomes More Important, Not Less

I often ask AI to review pull requests in production projects.

It can identify:

- suspicious logic
- missing validation
- possible race conditions
- type problems
- security concerns
- inconsistent error handling
- duplicated code

Some findings are false positives.

That is expected.

The useful part is the review process.

I still decide whether the issue is real.

I still decide whether the proposed change belongs in the project.

And by reviewing those suggestions, I learn more about the system.

That also improves how I instruct AI in future tasks.

There is a feedback loop:

> AI writes → I review → I understand the failure → I improve the constraints → AI produces better work.

---

## AI Can Help With Operations, But Production Needs Boundaries

AI-assisted deployment can also be powerful.

Instead of manually SSHing into a machine and reading Docker logs myself, an agent can potentially inspect logs and help diagnose failures.

But production access should be constrained.

Rather than giving an AI agent unrestricted credentials, a stronger setup might provide:

- temporary credentials
- least-privilege access
- read-only logs
- restricted deployment commands
- staging access
- audited operations

The productivity gain is real.

So is the operational risk.

Using AI professionally means understanding both.

---

## Documentation Has Changed Too

Documentation still matters.

However, I think the role of comments has changed.

Earlier in my career, I sometimes wrote complicated logic and then relied on comments to explain what it was doing.

I increasingly prefer the code itself to communicate the design.

Good names, small functions, explicit types and clear structure often provide better documentation than a paragraph explaining an unnecessarily complex implementation.

Project-level documentation is still extremely valuable:

- architecture decisions
- setup instructions
- domain behaviour
- deployment
- environment requirements
- integration boundaries

AI makes keeping that documentation updated much easier.

There is less excuse for having none.

---

## Knowing Syntax Is Less Valuable. Knowing Engineering Is More Valuable.

I no longer think memorising syntax should be one of the main measurements of developer ability.

We already have:

- autocomplete
- type systems
- linters
- documentation
- AI assistants

If I forget the exact signature of an API, I can recover it in seconds.

What matters more is whether I understand:

- what abstraction I need
- where the code belongs
- what can fail
- what trade-offs exist
- what security boundary applies
- what effect the decision has on the rest of the system

Programming languages are tools.

Software engineering is deciding how to use those tools to solve real problems.

---

## AI Has Made Me More Full-Stack, Not Less

AI reduced the amount of syntax I need to memorise.

But it increased the number of domains I can realistically work across.

Instead of remaining only in frontend development, I can work much more effectively across:

- frontend
- backend
- SQL
- infrastructure
- CI/CD
- Docker
- AI services
- deployment
- testing
- architecture

That does not mean I suddenly have the same depth as a specialist in every discipline.

It means AI makes crossing those boundaries much cheaper.

When I need to enter an unfamiliar domain, AI helps me understand the terminology, compare approaches and build an initial implementation much faster.

That makes a full-stack developer much closer to an end-to-end product engineer.

---

## Projects I Would Have Struggled to Build Before

Two examples for me are my GNAF-related project and an ERP system for Best Maker Pty Ltd.

Without AI, projects of that complexity would require significantly more manual research, debugging and implementation time.

Database work alone could require days of studying syntax, ORM behaviour and schema design before implementing the feature.

Debugging browser behaviour could consume hours of breakpoint-based investigation.

With AI-assisted development, browser automation and generated tests, much more of that feedback loop can be automated.

In my own experience, work that previously felt like a multi-month project can sometimes reach a usable state within weeks.

That is a major productivity change.

It is also why I do not believe the future developer is simply someone who types code faster.

AI already does that extremely well.

The developer's value is increasingly in knowing **what should happen next**.

---

## The Real Skill Is Decision-Making

The difference between a developer using AI and someone simply vibe coding is not whether both people use Codex or another coding agent.

The difference is the mental model behind it.

A software engineer asks:

- What problem are we solving?
- What constraints exist?
- How should we decompose it?
- What should AI be responsible for?
- What should stay under human control?
- What architecture supports our roadmap?
- How will this fail?
- How do we test it?
- How do we operate it?
- How will another developer maintain it?

AI can answer many of those questions.

But someone still has to judge the answers.

That is the part of software engineering that has become more important, not less.`

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
    title: 'How Software Engineers Use AI Differently From Vibe Coders',
    excerpt:
      'The same model in different hands produces different systems: decomposition, constraints, review, and decision-making separate engineering from vibe coding.',
    tags: ['AI', 'Workflows', 'Testing', 'DevOps'].map((tag) => ({ tag })),
    topics: topicIds,
    status: 'published' as const,
    publishedAt: '2026-10-02T09:00:00.000Z',
    content,
    seo: {
      title: 'How Software Engineers Use AI Differently From Vibe Coders',
      description:
        'The same model in different hands produces different systems: decomposition, constraints, review, and decision-making separate engineering from vibe coding.',
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
