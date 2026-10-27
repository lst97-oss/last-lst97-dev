/**
 * Seeds the v0.8.1 changelog entry.
 *
 * Sibling to `seed-changelog-v0-8-0.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed.
 *
 * Seeded at the v0.8.1 tag as `published`, so `ensurePublicationDate` stamps
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

const CHANGELOG_SLUG = 'v0-8-1'

const MARKDOWN = `## An introduction video on the home page

Zoom the welcome window and a short introduction video sits under the intro text. It is centred and scales with the window. The player is YouTube's privacy-enhanced mode, which sets no cookies until you press play, and it loads only while the video is on screen.

## A cleaner welcome window

The avatar and status log step aside in the zoomed view so the video has room. On a phone the video sits under the buttons, and the avatar and status log are hidden to keep the page short.`

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
    title: 'An introduction video on the welcome window',
    version: 'v0.8.1',
    excerpt:
      'A short introduction video under the intro text of the zoomed welcome window, with a layout that works on phones too.',
    changeTypes: ['feature'] satisfies ChangelogType[],
    tags: ['Home', 'Video'].map((tag) => ({ tag })),
    // Published at the v0.8.1 tag. There is no explicit `publishedAt`: the hook
    // stamps the write moment, which is already in the past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.8.1',
      description:
        'A short introduction video under the intro text of the zoomed welcome window, with a layout that works on phones too.',
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
