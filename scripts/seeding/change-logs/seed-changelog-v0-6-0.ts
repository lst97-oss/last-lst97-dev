/**
 * Seeds the v0.6.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-5-0.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed. Implementation detail lives in the GitHub
 * release notes, which this entry links to.
 *
 * Idempotent: matched by slug and updated in place.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'

/** The changelog change-type union, mirroring the select options on the collection. */
type ChangelogType =
  | 'feature'
  | 'improvement'
  | 'bug_fix'
  | 'security'
  | 'breaking_change'
  | 'maintenance'
  | 'documentation'

const CHANGELOG_SLUG = 'v0-6-0'

const MARKDOWN = `## The model that screens every message was replaced

Every message is read before anything else happens: is this in scope, is it safe, and which sources should answer it. That first read is done by a decision model, and it has been replaced with a newer one — a Perplexity decider served through the same gateway that already writes the replies.

Nothing about a conversation changes. What changes is how reliably the vague, the terse and the oddly worded are understood. This is also the groundwork for the rest of this release: the routing layer no longer depends on the old vendor's SDK, so the model behind it can be replaced again without touching anything else.

## The assistant now recognises your words for the right things

- **"Post" and "article" mean the blog.** Asking what the latest post is reads what is published here; asking whether something has been written about a topic, or what a piece argues, reads the written work itself.
- **"This site" splits in two.** What is published here answers from the site's content. How the site is built answers from its engineering documents — never with a price list.
- **Coding questions land on one source, not two.** A fixed-period total or share ("this week", "all time", editor and language shares) reads the public WakaTime shares; a named project, an explicit date, a language breakdown, a daily series or a streak reads the history warehouse.
- **Opinions are answered from what is on record.** "Do you think code is cheap?" or "What is your take on vibe coding?" are answered from the essays and interview answers that exist, rather than generic advice — and a new backstop guarantees that lookup even when the screening model would have skipped it.

## Try a question, now grouped by topic

The "TRY A QUESTION" panel has become tabs: **About**, **Projects**, **Writing**, **Technical**, **Coding**, **Site** and **Services**. Each tab holds examples drawn from what is actually indexed — how the G-NAF autocomplete routes broad-prefix queries, what was built for Wat Wat New Zealand, how to make a deployment safe when the API and database release separately, why the essays say code is cheap, an all-time language breakdown, or what the Go Support Plan includes. Clicking one fills the message box instead of sending, so it can be edited first.

## Smaller things

- **The pipeline page and the privacy notice describe the current setup**, including the gateway that screens messages and generates replies.
- **The contact page points quotation requests at the assistant by name**, and the explanation of what happens next reads more plainly.
- **This release is verified differently.** A permanent benchmark harness now measures every decision surface — screening, scope, source routing, the contact screens and the retrieval gate — against a committed corpus of real questions, so regressions show up as numbers rather than anecdotes.
- **Measured on that harness:** source selection was exact in 86.6% of routing runs (74.8% before this work), every benign question passed screening, zero hostile requests were let through, zero calls failed across 468 measured runs, and repeat runs selected the same sources every time.

Full technical detail, including what was verified and what is still open, is in the [v0.6.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.6.0).`

async function main() {
  const payload = await getPayload({ config })

  const changelogs = payload.config.collections.find((collection) => collection.slug === 'changelogs')
  const contentField = changelogs?.fields.find(
    (field): field is RichTextField => field.type === 'richText' && 'name' in field && field.name === 'content',
  )
  if (!contentField) throw new Error('The changelogs collection has no richText content field')

  const editorConfig = editorConfigFactory.fromField({ field: contentField })
  const content = convertMarkdownToLexical({ editorConfig, markdown: MARKDOWN })

  const data = {
    slug: CHANGELOG_SLUG,
    title: 'The assistant answers the right questions from the right sources',
    version: 'v0.6.0',
    excerpt:
      'The model that screens and routes every chat message was replaced, the assistant recognises posts, opinions and coding questions more accurately, and the example questions are grouped into tabs.',
    changeTypes: ['feature', 'improvement'] satisfies ChangelogType[],
    tags: ['Chat', 'Knowledge', 'Interface'].map((tag) => ({ tag })),
    status: 'published' as const,
    // Stamped during the v0.6.0 release day (2026-10-17 ~21:00 AEDT), already in
    // the past at publish time. Same reason as the v0.5.0 sibling: a future UTC
    // stamp keeps the row unpublished on /changelog until UTC midnight.
    publishedAt: '2026-10-17T10:00:00.000Z',
    featured: true,
    content,
    seo: {
      title: 'LAST//OS v0.6.0',
      description:
        'The screening model is replaced, posts, opinions and coding questions route to the right sources, and the example questions are grouped into tabs.',
    },
  }

  const existing = await payload.find({
    collection: 'changelogs',
    where: { slug: { equals: CHANGELOG_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const current = existing.docs[0]
  const saved = current
    ? await payload.update({ collection: 'changelogs', id: current.id, data, overrideAccess: true })
    : await payload.create({ collection: 'changelogs', data, overrideAccess: true })

  console.log(`\nChangelog ${current ? 'updated' : 'created'}: ${saved.slug} (id ${saved.id})`)
  console.log(`  version: ${saved.version}, change types: ${JSON.stringify(saved.changeTypes)}`)

  await payload.db.destroy?.()
}

await main()
process.exit(0)
