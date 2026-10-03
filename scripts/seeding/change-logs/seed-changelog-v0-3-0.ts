/**
 * Seeds the v0.3.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-1-0.ts` and deliberately identical in shape.
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

const CHANGELOG_SLUG = 'v0-3-0'

const MARKDOWN = `## Services, and an assistant that knows the price list

The biggest addition is a **Services** page. If you have ever wondered what working together actually costs, the packages, add-ons, delivery process, and support options are now written down and public — no enquiry required to find out whether the site is even right for you.

The chat assistant now knows the same information. Ask it what a project costs, what is included, or how the process works, and it answers from the published pricing rather than from a guess or a vague deflection.

## Project write-ups that go deep

Three projects now have proper long-form articles behind them. They are not summaries — they explain how the thing actually works: which approach was tried first, why a decision was made, and what was measured afterwards. If you want to know how the search, the crawler, or the settlement logic is built, the answer is written down rather than inferred.

Diagrams in those articles render as real diagrams instead of code listings, and each one is labelled for screen readers.

## Long articles are readable again

If you have read a project article here before, you may have noticed the paragraphs running together with no space between them. That was a styling fault, not a writing choice, and it is fixed.

## The site no longer needs JavaScript to tell you something

If JavaScript fails to load — a flaky connection, a strict privacy extension, an old browser — you now get a clear notice instead of a blank page. Pages that need something your browser cannot do say so plainly rather than half-working. Chat and the contact form each check what they actually require and tell you when it is missing.

## Other changes

- **Progress feedback** while navigating between pages, so a slow connection does not look like a frozen one.
- **The Melbourne temperature** now arrives with the page instead of popping in afterwards, and is fetched once rather than once per visitor.
- **Contact improvements.** Messages are no longer lost when the drafting assistant is unavailable — your own words are used instead — and each request type now reaches the right inbox.
- **Project pages carry topics and tags**, so you can browse related work by subject.

Full technical detail, including what was verified and what is still open, is in the [v0.3.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.3.0).`

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
    title: 'Services, and an assistant that knows the price list',
    version: 'v0.3.0',
    excerpt:
      'A public Services page with real pricing, an assistant that answers from it, three deep project write-ups, proper diagram rendering, and a site that degrades gracefully when JavaScript is unavailable.',
    changeTypes: ['feature', 'improvement', 'bug_fix'] satisfies ChangelogType[],
    tags: ['Services', 'Chat', 'Content', 'Accessibility'].map((tag) => ({ tag })),
    status: 'published' as const,
    publishedAt: '2026-10-03T00:00:00.000Z',
    featured: true,
    content,
    seo: {
      title: 'LAST//OS v0.3.0',
      description:
        'A public Services page with real pricing, a chat assistant that answers from it, three deep project write-ups, and a site that works without JavaScript.',
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
