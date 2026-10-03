/**
 * Seeds the v0.2.2 changelog entry.
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

const CHANGELOG_SLUG = 'v0-2-2'

const MARKDOWN = `## The site now scrolls on a phone

This release fixes the most obvious problem on the site: on a mobile phone, nothing scrolled. The home page and every other page stopped dead at the bottom of the first screen, and the rest of the content was simply unreachable. Not awkward — unreachable.

## What was happening

The site was built so that the desktop layout owns the scrolling, which is right for a desktop workspace and wrong for a phone. On a small screen the page was clamped to exactly one screenful, and everything below the fold was thrown away rather than merely hard to reach.

There are now two behaviours, chosen per page:

- **Pages without an inner scrolling area**, like the home page, scroll normally — you swipe the page and it moves, the way a phone page is supposed to.
- **Pages with their own scrolling area**, like chat and the project pages, keep their themed inner scrollbar so the navigation stays put and only the content moves.

The chat and contact pages were not opting into the second behaviour, so they were leaking a stray scrollbar past the edge. They now match every other page.

## The navigation dock

Rebuilding the dock on the themed scrollbar — which is what made it look consistent with the rest of the site — surfaced three defects that are now fixed: the dock stopped being pinned to the edge and stretched down the screen, a horizontal scrollbar appeared where it should not have, and the icons sat off to one side instead of centred. The selected item now highlights without shifting anything when you navigate.

## Chat on a small screen

The avatar beside each message was eating roughly a tenth of an already narrow screen, so replies got squeezed into a column. On a phone the label now moves inline into the message header and the reply uses the full width.

Full technical detail, including the measurements taken at several screen widths, is in the [v0.2.2 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.2.2).`

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
    title: 'The site now scrolls on a phone',
    version: 'v0.2.2',
    excerpt:
      'Mobile scrolling was broken site-wide: content below the first screen was unreachable on a phone. Both scroll models now behave, the navigation dock is repaired, and chat uses the full width on small screens.',
    changeTypes: ['bug_fix', 'improvement'] satisfies ChangelogType[],
    tags: ['Mobile', 'Navigation', 'Chat'].map((tag) => ({ tag })),
    status: 'published' as const,
    publishedAt: '2026-09-30T00:00:00.000Z',
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.2.2',
      description:
        'Mobile scrolling is fixed across the whole site, the navigation dock is repaired, and chat messages use the full width on small screens.',
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
