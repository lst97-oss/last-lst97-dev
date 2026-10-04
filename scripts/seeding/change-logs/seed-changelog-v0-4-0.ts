/**
 * Seeds the v0.4.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-3-0.ts` and deliberately identical in shape.
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

const CHANGELOG_SLUG = 'v0-4-0'

const MARKDOWN = `## A phone-sized navigation that stops hiding things

On a phone, navigation used to live behind a single **MENU** button that opened a panel sliding over the page you were trying to reach. There was not enough room in the header for that button and the "About this site" control together, so one of them always lost.

There is now a bar pinned to the bottom of every page below tablet width, with four destinations you can reach in one tap and a **More** menu for the rest. No page is reachable only by scrolling a menu, and the bar never covers content — the space it needs is reserved up front, so nothing is ever hidden underneath it.

The "About this site" panel moved into that menu, which is now the only way to open it on a phone.

## Browse work by subject

The blog and project listings can be filtered by topic straight from the URL, so a filtered list is a link you can share or bookmark rather than a one-off view. Each article now also carries a short list of related work beneath it, and the changelog has previous/next links so you can read a sequence without going back to the timeline.

## A share button that shows you what will be posted

Articles and project pages now have a share control that opens a preview of the actual card — title, description, and image — exactly as it will appear when posted. If a page has no image of its own, the preview says so rather than quietly substituting the site default and passing it off as the page's own.

## Two projects you can now read in depth

Best Maker and Canto101 join the existing long-form write-ups. These are not summaries — they explain how the thing actually works: which approach was tried first, why a decision was made, and what was measured afterwards. Canto101's material is marked private, so nothing here implies you can view the source.

## A fault that was quietly breaking every list page

If you have loaded the blog, the projects list, or the changelog here, the page was being rebuilt from scratch by the browser shortly after it appeared. The cause was a date being formatted two slightly different ways depending on which engine rendered it — the server and the browser disagreed about whether a date needed a leading zero. The visible result was fine, but the work thrown away to produce it was not.

Dates are now pinned so both render identically, and the page you are sent is the page that stays.

## Other changes

- **The default sharing card is now 41% smaller.** The image every social platform and chat app shows when you paste a link is a lighter format, at the same quality — the flat colours compress exactly.
- **Toasts now appear.** Confirmation messages were being generated correctly all along but never had anywhere to display. They now show, styled to match the rest of the site, and will not vanish if one is raised while the page is still loading.
- **Long articles read properly.** The blog and changelog detail pages now run the width of the page rather than a narrow column, matching the project pages.
- **Diagrams render at full size** and are no longer clipped by the page frame on article pages.
- **Fonts are served from this site** rather than a third party, so Windows no longer renders the page with a different typeface than everything else does.

Full technical detail, including what was verified and what is still open, is in the [v0.4.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.4.0).`

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
    title: 'A phone-sized navigation that stops hiding things',
    version: 'v0.4.0',
    excerpt:
      'A bottom navigation bar for phones, browsing by topic, a share preview that shows what will be posted, two more deep project write-ups, and a date-formatting fault that was rebuilding every listing page.',
    changeTypes: ['feature', 'improvement', 'bug_fix'] satisfies ChangelogType[],
    tags: ['Mobile', 'Navigation', 'Content', 'Fixes'].map((tag) => ({ tag })),
    status: 'published' as const,
    publishedAt: '2026-10-04T00:00:00.000Z',
    featured: true,
    content,
    seo: {
      title: 'LAST//OS v0.4.0',
      description:
        'A bottom navigation bar for phones, browsing by topic, a share preview, two more deep project write-ups, and a fix for a date fault that was rebuilding every listing page.',
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
