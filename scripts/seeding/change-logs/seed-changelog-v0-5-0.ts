/**
 * Seeds the v0.5.0 changelog entry.
 *
 * Sibling to `seed-changelog-v0-4-0.ts` and deliberately identical in shape.
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

const CHANGELOG_SLUG = 'v0-5-0'

const MARKDOWN = `## The whole site now rests on a different UI library

Every button, menu, dialog, dropdown and scrollable region on this site has been rebuilt on a different underlying library. This is invisible when it works, and that is the point: the reason for doing it was that parts of the interface were subtly wrong in ways that were tedious to pin down, and replacing the foundation was more honest than patching symptoms one at a time.

Two things visitors will actually notice. Confirmation messages now appear reliably, including one raised while the page is still loading. And a scrollbar no longer appears in panels that have nothing to scroll — previously an empty box could show a bar you could not drag anywhere.

## Photographs are no longer cropped to fit

Images in a gallery are now shown whole, at their own shape, instead of being forced into a wide frame that cut the top and bottom off anything that was not already the right proportions. A portrait screenshot is now readable as a screenshot.

This also means far less data is downloaded. The site was previously unable to offer a smaller version of a square or portrait image — every generated size was a wide crop — so in those cases it had no choice but to send the full-resolution original, even on a tile a fraction of the page wide.

## Long answers stop moving under you

The chat assistant writes its replies a piece at a time. Every paragraph already on screen used to shift whenever the next one began arriving, so text you were reading moved while you read it.

Spacing now works in one direction only. Each block reserves the gap above itself and never the gap below, which means a paragraph's position is final the moment it appears and stays there for the rest of the the reply.

## The message box no longer collapses

On a phone — and occasionally on a desktop browser — the chat input could appear as a single flattened line with the send button squeezed to its edges, and seemed to repair itself only once you started typing.

The cause was timing rather than styling: the page hides its contents until the browser has finished loading, and the box measured itself at exactly that moment, when there was nothing yet to measure. It now waits for a real size before sizing itself, and keeps watching so it is correct the instant the page appears.

## The keyboard shortcuts are now written down

Enter sends a message and Shift+Enter starts a new line. That was recorded only in a comment in the code, so the only way to learn it was to guess. Both are now shown beneath the box, and the image viewer does the same for its arrow keys and Escape. They are hidden on a phone, where there is no keyboard to press and the buttons say what they do.

## Back now lives in the window's title bar

Article, project and topic pages put their "back" link at the top of the page, above the content, where it read as part of the article rather than as part of the frame around it. It now sits in the title bar beside the page's name, where a back control belongs, and it is shown in a colour combination that is actually readable against that bar.

## One scrollbar on a phone, not two

On a phone, the site had two different ways of scrolling depending on the page, and the wrong one could be selected. The visible result was occasionally a browser scrollbar appearing beside the site's own, and content ending underneath the bottom navigation bar.

There is now a single scroll model on every page, and the space for the bottom bar is reserved on the element that actually scrolls.

## The assistant no longer tries to write things for you

Asking the assistant to "output a TypeScript" used to be treated as a fair technical question, and it would produce a generic script that was never what you wanted. Requests for the assistant to *write* something — code or text, in any language, or an action to perform — are now recognised as outside what it answers, along with follow-up messages that only narrow such a request.

Asking it a genuine question about software, about the work on this site, or about the services offered is unaffected.

## Other changes

- **A single shared card image per page** is now generated for each page rather than one default used everywhere, so a link pasted anywhere shows the page it actually points to.
- **The newest release and the previous one are now the only two shown together.** At either end of the archive there is just one, and it now takes the full width instead of sitting beside an empty column labelled "oldest release" or "newest release".
- **Paging controls cannot land on a page that no longer exists.** If content is edited while you are on a later page of the featured list, the list now corrects itself immediately rather than briefly showing an empty page.
- **This site is served by a faster, lighter foundation**, and the admin area is no longer cached by the network, which is a security improvement as well as a correctness one.

Full technical detail, including what was verified and what is still open, is in the [v0.5.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.5.0).`

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
    title: 'Photographs are no longer cropped, and long answers stop moving under you',
    version: 'v0.5.0',
    excerpt:
      'Images are shown whole instead of cropped, streamed chat replies stop reflowing, the message box no longer collapses, keyboard shortcuts are now written down, and the whole interface is rebuilt on a different UI library.',
    changeTypes: ['feature', 'improvement', 'bug_fix'] satisfies ChangelogType[],
    tags: ['Media', 'Chat', 'Navigation', 'Fixes'].map((tag) => ({ tag })),
    status: 'published' as const,
    publishedAt: '2026-10-06T00:00:00.000Z',
    featured: true,
    content,
    seo: {
      title: 'LAST//OS v0.5.0',
      description:
        'Images are shown whole instead of cropped, streamed chat replies stop reflowing, the chat input no longer collapses, keyboard shortcuts are documented, and the interface is rebuilt on Base UI.',
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
