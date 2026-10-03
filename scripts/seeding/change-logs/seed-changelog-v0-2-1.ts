/**
 * Seeds the v0.2.1 changelog entry.
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

const CHANGELOG_SLUG = 'v0-2-1'

const MARKDOWN = `## Broken links now land somewhere real

Previously, typing a wrong address gave you a bare "Not Found" on a blank page. This release replaces it with an actual 404 window in the site's own styling: it shows the address you asked for and offers a way back to the desktop or the project index.

## The admin panel stopped looking broken

While fixing the 404 page, the site stylesheet spilled into the editing panel and left it rendering as unstyled text. That is fixed — the admin panel now looks like itself again, and the site's styling stays on the site.

## A production fix

Saving from the admin panel was being rejected as a permissions error, even though reading worked fine. Nothing was wrong with the account or the permissions; the live site's address had drifted from the one the request was being checked against, so the save looked like it came from somewhere untrusted. The site is now pinned to its real address, and saving works.

## Why it matters

None of this is dramatic on its own. Together it is the difference between a site that looks deliberate when something goes wrong and one that looks abandoned — and between an admin panel you can work in and one you have to squint at.

Full technical detail is in the [v0.2.1 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.2.1).`

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
    title: 'Broken links now land somewhere real',
    version: 'v0.2.1',
    excerpt:
      'A styled 404 page instead of a bare error, an admin panel that renders correctly again, and a fix for saves being wrongly rejected in production.',
    changeTypes: ['improvement', 'bug_fix'] satisfies ChangelogType[],
    tags: ['Design', 'Admin', 'Fixes'].map((tag) => ({ tag })),
    status: 'published' as const,
    publishedAt: '2026-09-30T00:00:00.000Z',
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.2.1',
      description:
        'A styled 404 page, an admin panel that renders correctly again, and a fix for saves being wrongly rejected in production.',
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
