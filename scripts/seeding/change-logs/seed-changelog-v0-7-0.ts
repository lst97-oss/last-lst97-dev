/**
 * Seeds the v0.7.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-6-4.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed. Implementation detail lives in the GitHub
 * release notes, which this entry links to.
 *
 * Seeded at the v0.7.0 tag as `published`, so `ensurePublicationDate` stamps
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

const CHANGELOG_SLUG = 'v0-7-0'

const MARKDOWN = `## Every post, project and changelog entry has a comment thread

Each blog post, project and changelog entry now ends with its own comment section. Readers can post, reply, edit their own comments and vote. Signing in brings them back to the page they were reading, and the section loads as it scrolls into view, so the page itself stays as quick as before.

## A failed sign-in tells you why

If Google sign-in does not complete, the comment section says what went wrong instead of quietly returning you to the page. A successful sign-in returns you to the same entry.

## Roles are visible in the thread

Site admins get an Admin badge and their name in the admin colour, and signed-in members get a Member badge, so a reply from the site owner is easy to spot. The human verification step appears only when Cloudflare asks for it.

## Deleting content removes its thread

Unpublishing an entry keeps its comments, so it can be published again. Deleting a post, project or changelog entry deletes its comment thread with it.

Full technical detail is in the [v0.7.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.7.0).`

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
    title: 'Every post, project and changelog entry now has a comment thread',
    version: 'v0.7.0',
    excerpt:
      'Blog posts, projects and changelog entries now take comments, sign-in returns readers to the page they were on, and deleting content removes its thread.',
    changeTypes: ['feature'] satisfies ChangelogType[],
    tags: ['Comments', 'Sign-in'].map((tag) => ({ tag })),
    // Published at the v0.7.0 tag. There is no explicit `publishedAt`: the hook
    // stamps the write moment, which is already in the past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.7.0',
      description:
        'Comment threads on blog posts, projects and changelog entries, with sign-in that returns readers to the same page.',
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
