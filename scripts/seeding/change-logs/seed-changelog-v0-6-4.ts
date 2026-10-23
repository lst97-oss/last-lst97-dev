/**
 * Seeds the v0.6.4 changelog entry.
 *
 * Sibling to `seed-changelog-v0-6-3.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed. Implementation detail lives in the GitHub
 * release notes, which this entry links to.
 *
 * Seeded at the v0.6.4 tag as `published`, so `ensurePublicationDate` stamps
 * the date at write time.
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

const CHANGELOG_SLUG = 'v0-6-4'

const MARKDOWN = `## Going back to a page you just read no longer waits on the server

The site now keeps the content it has already loaded for five minutes. Clicking back to a project, returning to the blog after reading a post, or moving between topic filters reuses what your browser already has instead of asking the server again. A page you have not opened, or one whose address or filters changed, is still fetched fresh.

## The data behind each page is cached the way the page already was

Public page data — the project list, blog posts, changelogs, topics, the temperature, the coding snapshot — is now held at the edge for an hour and refreshed in the background after that. One visitor's read now serves the next visitor, so the database is read once per cache window rather than once per visit. Your browser still checks on every navigation and takes the newer copy as soon as the cache rolls over.

## The admin panel is never cached

Editing is deliberately excluded from both layers. Every admin request is marked private and revalidated, and the panel refuses router-cached data, so an edit you have just saved is the edit you see — no stale gallery, no stale form, and nothing from one session served to another.

## The status light checks less often

The health indicator now checks once every five minutes instead of every thirty seconds, and pauses while its tab is in the background, probing immediately when you come back. The health endpoint may itself be served from the edge for up to a minute. A tab left open reports an outage at its next check — within five minutes — and a tab you return to reports it as soon as you look at it.

Full technical detail is in the [v0.6.4 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.6.4).`

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
    title: 'Pages you have already opened now come back without a round trip',
    version: 'v0.6.4',
    excerpt:
      'Public page data is now cached at the edge and reused across navigations, while the admin panel and every edit in it stay uncached.',
    changeTypes: ['improvement'] satisfies ChangelogType[],
    tags: ['Performance', 'Caching'].map((tag) => ({ tag })),
    // Published at the v0.6.4 tag. Like the v0.6.3 sibling there is no explicit
    // `publishedAt`: the hook stamps the write moment, which is already in the
    // past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.6.4',
      description:
        'Repeat navigation and public page data now come from the edge cache, so the same content is not rendered or queried once per visitor.',
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
  console.log(
    `  version: ${saved.version}, status: ${saved.status}, change types: ${JSON.stringify(saved.changeTypes)}`,
  )

  await payload.db.destroy?.()
}

await main()
process.exit(0)
