/**
 * Seeds the 'What Does "Junior Developer" Mean When AI Can Already Code?' blog post plus its topics.
 *
 * Argues the junior bar moves from syntax to independence, system thinking, and communication.
 *
 * Tags are inline rows on the posts collection, not a vocabulary
 * collection, so only topics are upserted. Idempotent: matched by slug
 * and updated in place.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

const POST_SLUG = 'what-junior-developer-means-when-ai-can-code'

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
  {
    slug: 'software-careers',
    title: 'Software Careers',
    description: 'Entering and growing in software development in an AI-assisted industry.',
  },
] as const

const MARKDOWN = `AI has created an uncomfortable question for people entering software development:

> What happens to junior developers when AI can already write code extremely well?

I think the answer is more complicated than:

> AI will replace junior developers.

Some junior-level work is absolutely being automated.

But I think the bigger change is that the definition of a junior developer is moving.

The entry bar is becoming less about how much syntax you know and more about how independently you can think.

---

## The Old Junior Developer Model

Traditionally, junior developers could enter a team and gradually receive small tasks.

For example:

- fix a small bug
- change some CSS
- write documentation
- create a CRUD endpoint
- convert a design into HTML
- add a form
- update a unit test
- rename or refactor something

The work was intentionally limited.

A senior developer made most of the important decisions.

The junior implemented them.

That model worked because even relatively simple implementation required human time.

Today, AI can perform many of those tasks almost instantly.

That changes the economics.

If the responsibility is simply:

> Here is a precise instruction. Implement exactly this small change.

an AI agent is becoming increasingly competitive with a junior developer.

That does not mean juniors have no value.

It means waiting for instructions is becoming a dangerous career strategy.

---

## The Junior Developer Who Waits for Tickets Is at Risk

I think one of the least valuable developer behaviours today is passivity.

Imagine two juniors.

Developer A receives a task and says:

> Tell me exactly what to do.

Developer B receives the same problem and says:

> I investigated this. I think there are three possible approaches. I tried the first one in a branch. Here are the trade-offs. I recommend option B because we are planning feature X next month.

The second developer is significantly more valuable.

Not because they typed more code.

Because they reduced the amount of thinking that someone else needed to do.

That is becoming one of the most important forms of leverage in software teams.

---

## I Would Not Define Developer Level Only by Coding Ability Anymore

Historically, people often associated seniority with how difficult a piece of code someone could write.

That still matters.

But I do not think coding ability alone is enough anymore.

AI is already extremely capable at implementation.

So I increasingly think about developer level in terms of things like:

- independence
- communication
- problem framing
- system thinking
- decision quality
- ownership
- risk awareness
- ability to evaluate trade-offs

A junior developer may be someone who can implement features but still needs someone else to construct the broader mental model.

A more experienced developer receives an ambiguous business problem and starts creating that model themselves.

That is a much more meaningful distinction in an AI-assisted world.

---

## Juniors Need to Learn More, Not Less

It might sound strange, but I think AI means junior developers need broader knowledge than before.

AI removes some low-level learning costs.

You do not need to spend three days memorising syntax.

You do not need to manually read every page of documentation before experimenting.

You can ask AI:

- What does this architecture do?
- What are the trade-offs?
- Show me a minimal example.
- Why did this fail?
- Compare these three approaches.
- Explain this unfamiliar repository.

That is an enormous advantage.

But the time saved should not simply be used to produce more code.

It should be reinvested into understanding more of the system.

A junior developer can now realistically learn across:

- frontend
- backend
- databases
- authentication
- testing
- Docker
- CI/CD
- cloud infrastructure
- security
- AI integration

That would have been much slower before.

---

## Syntax Is Becoming Cheap

I do not think memorising syntax has the same value it once had.

If I forget the exact TypeScript syntax for something, that problem is trivial to solve.

The same applies to:

- SQL syntax
- Docker syntax
- regular expressions
- framework APIs
- configuration formats

We have AI, autocomplete, language servers and linters.

What is harder to automate is knowing:

> Should we be doing this at all?

That is where engineering knowledge matters.

You might know exactly how to create another microservice.

The important question is whether the project actually needs another microservice.

You might know exactly how to create a new database table.

The important question is whether that information belongs in a new entity or in an existing aggregate.

You might know how to generate JWT authentication from scratch.

The important question is why you are implementing custom authentication instead of using a mature solution.

Syntax is implementation knowledge.

Engineering is decision knowledge.

---

## Security Fundamentals Become More Important

If I were advising a junior developer today, security would be high on my list.

AI can generate a working feature extremely quickly.

That makes it easier than ever to accidentally ship an insecure feature.

A developer should understand concepts such as:

- authentication vs authorisation
- server-side validation
- input sanitisation
- least privilege
- secrets management
- rate limiting
- SQL injection
- XSS
- CSRF
- access control
- secure session handling

You do not need to become a dedicated security engineer.

But you need enough knowledge to recognise when AI has crossed an important security boundary.

---

## System Design Is No Longer Just a Senior Interview Topic

I also think juniors should start learning system design earlier.

Not the kind of system design where you memorise how Netflix supposedly works.

Start with practical questions.

For example:

> Where should this logic live?

> Should this run synchronously or asynchronously?

> What owns this data?

> Should this component know about this service?

> What happens if this operation runs twice?

> What happens when the external API is unavailable?

> How should we migrate this schema later?

These questions directly affect everyday development.

AI can write either implementation.

Your job is increasingly deciding which implementation belongs in the system.

---

## Communication Is an Engineering Skill

Communication also becomes more important.

A developer should be able to explain to a manager or senior engineer:

> I recommend approach A because it is simpler and matches our current scale. Approach B gives us more flexibility but introduces additional infrastructure that we probably do not need yet.

That is much more useful than:

> AI recommended approach A.

AI should improve your decision-making.

It should not become the source of your authority.

You need to be able to explain the decision yourself.

---

## What I Would Look for When Hiring a Junior

If I were hiring a junior developer today, I would care much less about whether they memorised every framework API.

I would look for curiosity.

I would want someone who experiments with new technology because they are genuinely interested in understanding what it can do.

For example, when a new model, framework or tool is released, I would like the junior to think:

> Could this improve something in our existing project?

Then investigate it.

Maybe the answer is no.

That is fine.

The important part is that they explored the idea, evaluated it and can explain what they learned.

I would rather work with a junior who says:

> I tested this new tool. It improves this part of our workflow, but I don't recommend migrating because these three limitations outweigh the benefit.

than someone who simply waits for the next assigned ticket.

---

## Do Not Hide AI-Assisted Portfolio Projects

Some junior developers are worried that employers will dismiss a project if AI helped build it.

I think that is the wrong way to think about a portfolio.

I care much more about whether you can explain the project.

If AI wrote 80% of your code but you can explain:

- why the architecture looks this way
- why you selected the framework
- how the database works
- how authentication works
- how you deployed it
- what bugs you encountered
- what trade-offs you made
- what you would change next
- how you would scale it

then the project still demonstrates substantial engineering ability.

On the other hand, if you personally typed every line but cannot explain why the system works the way it does, that is much less convincing.

The important question is not:

> How many characters did you type?

It is:

> Do you own the decisions behind this system?

---

## Real Projects Still Teach Real Skills

AI-assisted projects can still teach you a huge amount.

You still encounter:

- unclear requirements
- deployment failures
- integration problems
- environment differences
- user feedback
- edge cases
- performance issues
- feature requests
- conflicting requirements

AI can help solve them.

But you still experience the engineering process.

That is valuable.

In my own projects, AI has allowed me to attempt systems I would previously have needed much longer to build.

That gave me exposure to more technologies, more deployment scenarios and more real-world problems.

I see that as a benefit for learning, not a disadvantage.

---

## LeetCode Is Becoming a Weaker Proxy

Traditional coding interviews often rely heavily on algorithm questions.

There is still value in understanding algorithms and data structures.

But I think interviews should become broader.

AI is already extremely capable at many competitive-programming-style problems.

An interview environment where candidates are forbidden from using the tools they will use every day at work is increasingly artificial.

I would rather ask candidates questions such as:

> Here are three ways we could implement this feature. Which one would you choose and why?

or:

> This service occasionally creates duplicate records. How would you investigate it?

or:

> Product wants this feature next week. What information do you need before you begin?

or:

> This AI-generated implementation works. What concerns do you have before approving it?

These questions expose engineering judgment.

---

## Should AI Be Banned During Interviews?

In general, I do not think banning AI completely represents modern development.

The real workplace increasingly involves developers cooperating with AI.

There are legitimate exceptions.

A company may have sensitive source code that cannot be sent to an external provider.

But even then, organisations can use:

- approved enterprise services
- self-hosted models
- local LLMs
- restricted internal tooling

So rather than pretending AI does not exist, I think interviews should evaluate how candidates use it.

Give someone access to an AI coding tool.

Then observe:

- How do they frame the problem?
- What context do they provide?
- Do they blindly accept suggestions?
- Do they test the implementation?
- Can they identify bad assumptions?
- Can they explain the generated code?
- Can they reject a poor solution?
- Can they improve their instructions after a failure?

That is becoming a real engineering skill.

---

## AI Raises the Floor and the Ceiling

AI makes it easier for someone with limited programming experience to produce working software.

That raises the floor.

But AI also allows experienced developers to operate across more domains, investigate faster and ship much larger systems.

That raises the ceiling.

This is why I do not think AI automatically equalises software developers.

The same AI model in two people's hands can produce dramatically different outcomes.

The model provides implementation ability.

The person provides direction.

---

## What Juniors Should Focus On

If I were entering software development today, I would spend less time trying to memorise every piece of syntax and more time developing:

- problem decomposition
- system design
- debugging
- security fundamentals
- Git
- databases
- testing
- deployment
- requirements analysis
- communication
- architectural judgment
- AI-assisted workflows

Most importantly, I would build real projects.

Deploy them.

Break them.

Fix them.

Add features six months later.

Let another person use them.

Receive confusing requirements.

Deal with production problems.

Those experiences teach things that a coding exercise cannot.

---

## The Junior Developer Has Not Disappeared

I do not think junior developers are disappearing.

But I do think the passive junior developer is becoming much less valuable.

The future junior developer should not simply be someone who writes code under supervision.

They should increasingly be someone who can take a smaller problem, investigate it, use AI effectively, make reasonable decisions and return with a proposed solution.

They will still need mentorship.

They will still make mistakes.

They will still need senior developers to help with difficult trade-offs.

But the baseline is moving upward.

And AI is one of the reasons.

The good news is that juniors also have access to the same technology that is raising those expectations.

AI gives new developers an extraordinary learning tool.

Used properly, it can help someone reach broader engineering competence much faster than before.

The challenge is making sure AI is used to accelerate learning rather than replace thinking.

That distinction may define the next generation of software developers.

> **The future belongs less to developers who can type code quickly, and more to developers who can decide what code should exist in the first place.**`

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
    title: 'What Does "Junior Developer" Mean When AI Can Already Code?',
    excerpt:
      'AI automates ticket-sized implementation, so the junior bar moves from syntax to independence, system thinking, security, and communication.',
    tags: ['AI', 'Careers', 'Junior Developers', 'Hiring'].map((tag) => ({ tag })),
    topics: topicIds,
    status: 'published' as const,
    publishedAt: '2026-10-03T09:00:00.000Z',
    content,
    seo: {
      title: 'What Does "Junior Developer" Mean When AI Can Already Code?',
      description:
        'AI automates ticket-sized implementation, so the junior bar moves from syntax to independence, system thinking, security, and communication.',
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
