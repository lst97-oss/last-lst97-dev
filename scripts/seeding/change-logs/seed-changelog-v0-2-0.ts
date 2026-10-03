/**
 * Seeds the v0.2.0 changelog entry.
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

const CHANGELOG_SLUG = 'v0-2-0'

const MARKDOWN = `## A proper content system

Until now the site was mostly hand-written. This release replaces that with a real editorial system, so writing a post or adding a project is a content edit rather than a code change.

## What changed

- **Everything is editable in the browser.** Posts, projects, changelog entries, and images all live in a built-in admin panel. Drafts stay drafts until they are published.
- **Images behave properly.** Photos are uploaded once and reused at the right size for a thumbnail, a card, or a full-width hero — so a gallery page loads quickly and never crops someone awkwardly.
- **Articles got richer.** Longer posts now show an estimated reading time, and every entry carries a proper publication date.
- **Search engines get a cleaner site.** Each page now declares what it is, so links shared to social platforms and to search engines show the right title, summary, and image.
- **Writing is faster.** Pasting markdown keeps its formatting, and images dropped into the editor upload correctly.

## Better writing, better reading

The content side is now strong enough to carry proper long-form work. Articles support code listings, tables, diagrams, checklists, and galleries, and every diagram is labelled for screen readers rather than being an unexplained picture.

## A fix worth mentioning

Content on this site was previously writable by anyone who found the URL. Write access now requires an account, so a stranger cannot quietly rewrite your history.

Full technical detail is in the [v0.2.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.2.0).`

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
    title: 'A proper content system',
    version: 'v0.2.0',
    excerpt:
      'Posts, projects, images, and changelog entries are now editable in the browser instead of hand-written in code, with reading times, richer articles, and write access that finally requires an account.',
    changeTypes: ['feature', 'security', 'improvement'] satisfies ChangelogType[],
    tags: ['CMS', 'Editorial', 'Media'].map((tag) => ({ tag })),
    status: 'published' as const,
    publishedAt: '2026-09-30T00:00:00.000Z',
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.2.0',
      description:
        'A real content system for LAST//OS: browser-based editing, properly sized images, richer articles, cleaner search metadata, and write access that requires an account.',
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
