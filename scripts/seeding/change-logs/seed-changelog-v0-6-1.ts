/**
 * Seeds the v0.6.1 changelog entry.
 *
 * Sibling to `seed-changelog-v0-6-0.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed. Implementation detail lives in the GitHub
 * release notes, which this entry links to.
 *
 * Seeded at the v0.6.1 tag as `published`, so `ensurePublicationDate` stamps
 * the date at write time. It stayed `draft` until the tag so seeding it ahead
 * of the release could not put it on the public timeline.
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

const CHANGELOG_SLUG = 'v0-6-1'

const MARKDOWN = `## Every database connection now checks who is on the other end

Every page you can read here — the portfolio, the posts, the changelog — and every lookup behind the assistant reaches a hosted PostgreSQL server over the network. That connection has always been encrypted, but encryption alone only keeps the traffic private; it says nothing about who is on the other end. Until this release, a connection would have been accepted from anything presenting some certificate.

The identity is now verified. The host's certificate is pinned, and both halves of the site check the server against it before sending anything: the content side and the assistant's knowledge and coding-history lookups. If the endpoint ever presents a different certificate, the connection is refused rather than trusted. Verified against the live endpoint: the correct certificate connects, and a wrong one fails closed.

## The database can no longer be oversubscribed

The hosted database accepts a fixed number of simultaneous connections, and every warm serverless instance keeps its own small pool of them. Those pools had been sized for a single instance, so two busy instances could take the database to its ceiling — and requests start failing when the ceiling is reached. Each pool now holds a share of the budget, so three warm instances stay comfortably under the limit. The assistant's lookups run one at a time, so the smaller pools are headroom, not contention.

## The contact window explains itself again

The contact page keeps its "what happens next" and first-message guidance out of sight until the window is maximized, while leaving the text in the page for search engines either way. A recent layout pass dropped the line that told visitors maximizing would reveal it, so the guidance became discoverable by crawlers but not by people. The hint is back, in the same style as the about window, and it names what the hidden panels hold: what happens next, and how to write a first message that gets an answer.

## Smaller things

- **The assistant's lookups run on the runtime's native database driver.** Knowledge search and coding history now use the built-in client instead of a separate Postgres library.
- **The site is built on Bun 1.4.3.** Type-checking now uses the runtime's built-in checker, so the toolchain carries one less compiler.
- **Internal content and knowledge scripts use native APIs** for files, environment values, and waits where they previously relied on compatibility shims or shell helpers.

Full technical detail, including the verification behind the certificate change, is in the [v0.6.1 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.6.1).`

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
    title: 'The site now verifies the database it talks to',
    version: 'v0.6.1',
    excerpt:
      'Database connections now verify the server certificate instead of only encrypting traffic, the connection pool can no longer be oversubscribed by concurrent instances, and the contact window points to its hidden guidance again.',
    changeTypes: ['security', 'improvement', 'bug_fix'] satisfies ChangelogType[],
    tags: ['Security', 'Infrastructure', 'Fixes'].map((tag) => ({ tag })),
    // Published at the v0.6.1 tag. Unlike the v0.5.0/v0.6.0 siblings there is no
    // explicit `publishedAt`: the hook stamps the write moment, which is already
    // in the past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.6.1',
      description:
        'Database connections are now verified against a pinned certificate, the connection budget can no longer be exhausted by concurrent instances, and the contact window explains its hidden guidance again.',
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
