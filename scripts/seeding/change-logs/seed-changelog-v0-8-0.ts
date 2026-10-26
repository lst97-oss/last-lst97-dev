/**
 * Seeds the v0.8.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-7-0.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed.
 *
 * Seeded at the v0.8.0 tag as `published`, so `ensurePublicationDate` stamps
 * the date at write time.
 *
 * Idempotent: matched by slug and updated in place.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { RichTextField } from 'payload'
import { getPayload } from 'payload'
import config from '../../../payload.config'
import type { LexicalNodes_206F9798 } from '../../../payload-types'
import { savedDocument } from '../payload-result'

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

Comment cards no longer draw a shadow along their bottom edge. The ⋮ menu on each comment is a flat popover with a solid border, and the thread now spans the full width of its window instead of sitting inside the article padding.

## Math and diagrams in comments

Comments can render \`$…$\` / \`$$…$$\` formulas with KaTeX and \`\`\`mermaid fences as diagrams. Both are off by default for hosts that do not need them and load lazily, so a page without a formula downloads neither library. The site enables both.

## Comment threads follow the site's policy

The comment section reads the site's access level, length limit, guest edit window and voting switch from the comments service. A site that asks readers to sign in shows one sign-in card instead of a refused request, and a guest can delete their own comment with the edit key issued when they posted.

## Two new project pages

[last-cli](/projects/last-cli) is the scaffolding CLI, with its two public templates. [last-comments](/projects/last-comments) is the self-hosted comment service, and the widgets that embed it on any page.

## A sturdier admin and a clearer system status

The CMS moved to Payload 4. Existing media derivatives were preserved by renaming the stored image variants in place; native image processing is paused on the serverless host while its libvips packaging is resolved. The desktop system menu now carries the site status as its own badge, and first-party responses send HSTS, nosniff and a strict referrer policy in production.

Full technical detail is in the [v0.8.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.8.0).`

async function main() {
  const payload = await getPayload({ config })

  const changelogs = payload.config.collections.find((collection) => collection.slug === 'changelogs')
  const contentField = changelogs?.fields.find(
    (field): field is RichTextField => field.type === 'richText' && 'name' in field && field.name === 'content',
  )
  if (!contentField) throw new Error('The changelogs collection has no richText content field')

  const editorConfig = editorConfigFactory.fromField({ field: contentField })
  const content = convertMarkdownToLexical<LexicalNodes_206F9798>({ editorConfig, markdown: MARKDOWN })

  const data = {
    slug: CHANGELOG_SLUG,
    title: 'A sturdier CMS, richer comments and two new project pages',
    version: 'v0.8.0',
    excerpt:
      'Payload 4, math and Mermaid comments, a policy-driven comment widget, flatter threads, a system status badge, and project pages for last-cli and last-comments.',
    changeTypes: ['feature'] satisfies ChangelogType[],
    tags: ['Comments', 'CMS', 'Projects'].map((tag) => ({ tag })),
    // Published at the v0.8.0 tag. There is no explicit `publishedAt`: the hook
    // stamps the write moment, which is already in the past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.8.0',
      description:
        'Payload 4, math and Mermaid comments, a policy-driven comment widget, flatter threads, a system status badge, and project pages for last-cli and last-comments.',
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
  const saved = savedDocument(
    current
      ? await payload.update({ collection: 'changelogs', id: current.id, data, overrideAccess: true })
      : await payload.create({ collection: 'changelogs', data, overrideAccess: true }),
  )

  console.log(`\nChangelog ${current ? 'updated' : 'created'}: ${saved.slug} (id ${saved.id})`)
  console.log(
    `  version: ${saved.version}, status: ${saved.status}, change types: ${JSON.stringify(saved.changeTypes)}`,
  )

  await payload.db.destroy?.()
}

await main()
process.exit(0)
