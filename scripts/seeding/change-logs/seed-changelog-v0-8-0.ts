/**
 * Seeds the v0.8.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-7-0.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed.
 *
 * Seeded as a `draft`, so it stays off `/changelog` until the v0.8.0 tag. At
 * that point, flip `status` to `published` and rerun this seed.
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

const CHANGELOG_SLUG = 'v0-8-0'

const MARKDOWN = `## Quieter comment threads

Comment cards no longer draw a shadow along their bottom edge. The ⋮ menu on each comment is a flat popover with a solid border.

## Two new project pages

[last-cli](/projects/last-cli) is the scaffolding CLI, with its two public templates. [last-comments](/projects/last-comments) is the self-hosted comment service, and the widgets that embed it on any page.`

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
    title: 'Flatter comment threads, and two new project pages',
    version: 'v0.8.0',
    excerpt:
      'Comment cards and the ⋮ menu are flatter, and the site now has project pages for last-cli and last-comments.',
    changeTypes: ['feature'] satisfies ChangelogType[],
    tags: ['Comments', 'Projects'].map((tag) => ({ tag })),
    // A draft until the v0.8.0 tag: the publish hook stamps the date when this flips to published.
    status: 'draft' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.8.0',
      description: 'Flatter comment threads, and project pages for last-cli and last-comments.',
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
