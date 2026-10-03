/**
 * Seeds the v0.1.0 changelog entry.
 *
 * Sibling to the other `change-logs` seeds and deliberately identical in shape
 * to the `projects` seeds: the Payload local API, a Markdown literal converted
 * with `convertMarkdownToLexical`, and a slug-keyed upsert so repeated runs
 * never accumulate duplicates.
 *
 * Audience: this is the customer-facing `/changelog` timeline, so the copy
 * describes what a visitor can now *do*, not which files changed. Implementation
 * detail lives in the GitHub release notes, which this entry links to.
 *
 * Idempotent: matched by slug and updated in place.
 *
 * Writes to whatever DATABASE_URL is loaded — exporting a production URL before
 * running this points it at production. Against the Zeabur endpoint that URL
 * needs `?sslmode=no-verify`: the certificate is self-signed.
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

const CHANGELOG_SLUG = 'v0-1-0'

const MARKDOWN = `## The first release

LAST//OS is now live at [www.lst97.dev](https://www.lst97.dev). This is the first tagged release, and it is the whole thing rather than a preview: the site, the chat assistant, and the editing system behind them all work.

## What you can do here

- **Browse the work.** Projects, blog posts, and changelog entries live in one place, presented as a desktop-style workspace you can move around.
- **Ask about anything on the site.** The chat assistant answers from the site's own content and from Nelson's indexed knowledge, then shows you the sources it used. If it does not know, it says so.
- **Read long-form articles.** Project write-ups go deep on how something actually works, rather than restating a summary.
- **Get in touch.** A contact form that routes your message to the right template instead of a blank inbox.

## About the assistant

The assistant is deliberately narrow. It knows about software development, the work published on this site, and the coding history behind it — so when you ask "how should I structure this?" you get Nelson's recorded reasoning rather than a generic answer. General questions outside that scope are declined rather than guessed at, and every answer carries the references it was drawn from.

## Editing

Everything published here is editable through a built-in admin panel, so posts, projects, and changelog entries can be corrected and updated without touching code.

Full technical detail, including what was verified and what is still open, is in the [v0.1.0 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.1.0).`

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
    title: 'The first release',
    version: 'v0.1.0',
    excerpt:
      'LAST//OS goes live — the portfolio site, a source-grounded chat assistant that answers from the site’s own content, and the editing system behind both.',
    changeTypes: ['feature'] satisfies ChangelogType[],
    tags: ['Launch', 'Chat', 'Portfolio'].map((tag) => ({ tag })),
    status: 'published' as const,
    // Matches the GitHub release date so the timeline and the tags agree.
    publishedAt: '2026-09-28T00:00:00.000Z',
    featured: true,
    content,
    seo: {
      title: 'LAST//OS v0.1.0',
      description:
        'The first release of LAST//OS: a desktop-styled portfolio site with a chat assistant that answers from the site’s own content and shows its sources.',
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
