/**
 * Seeds the v0.6.3 changelog entry.
 *
 * Sibling to `seed-changelog-v0-6-2.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed. Implementation detail lives in the GitHub
 * release notes, which this entry links to.
 *
 * Seeded at the v0.6.3 tag as `published`, so `ensurePublicationDate` stamps
 * the date at write time. It stays `draft` until the tag so seeding it ahead
 * of the release cannot put it on the public timeline.
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

const CHANGELOG_SLUG = 'v0-6-3'

const MARKDOWN = `## Automated traffic is turned away before it reaches the assistant

The assistant answers real questions and costs real money doing it, and the contact form sends real email. Both were reachable by anything that could speak HTTP. A script could post a message — or a thousand of them — and every one of them would be screened, answered, and delivered as though a person had asked. The site did ask visitors to prove they were people: the security check in the browser, before the message was sent. But that check was tied to the form, not to the traffic. A request that skipped the form entirely never met it.

That gap is closed. Vercel's BotID now classifies every request to the chat endpoint and the contact endpoint before either one reaches the screening model, the answer model, or the mail server. A request that looks automated is refused with a plain message. A request that looks like a person continues exactly as before.

## Nothing changes for a visitor

BotID is invisible. There is no new checkbox, no puzzle, and nothing to solve. The browser attaches a challenge to the request the way it already attaches the security check, Vercel reads the result, and the conversation starts. A visitor who arrives through a link, a search, or a bookmark is not asked to do anything different than before, and the two protections are independent: the browser security check still stands on its own, and BotID still works if a visitor never sees that check at all.

## The check is on the request, not the account

BotID judges each request as it arrives rather than clearing a visitor once and letting that clearance cover everything afterwards. That matters for the two endpoints where it applies, because each request is the thing that costs something: one chat turn is one screening call and one answer call, and one contact submission is a screening call, a refinement, and an email. A blocked request spends none of it. The public pages, the search engine crawlers, and the health check are deliberately left alone — this is aimed at the endpoints that spend money, not at the site as a whole.

Full technical detail is in the [v0.6.3 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.6.3).`

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
    title: 'The assistant and the contact form now turn away automated traffic',
    version: 'v0.6.3',
    excerpt:
      'Every chat and contact request is now classified as human or automated before it reaches the screening model, the answer model, or the mail server.',
    changeTypes: ['security', 'improvement'] satisfies ChangelogType[],
    tags: ['Security', 'Assistant', 'Contact'].map((tag) => ({ tag })),
    // Published at the v0.6.3 tag. Like the v0.6.2 sibling there is no explicit
    // `publishedAt`: the hook stamps the write moment, which is already in the
    // past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.6.3',
      description:
        'Chat and contact requests are classified as human or automated before any model call, so automated traffic never spends a token or sends an email.',
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
