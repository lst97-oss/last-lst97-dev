/**
 * Seeds the v0.6.2 changelog entry.
 *
 * Sibling to `seed-changelog-v0-6-1.ts` and deliberately identical in shape.
 * Audience: the customer-facing `/changelog` timeline — what a visitor can now
 * do, not which files changed. Implementation detail lives in the GitHub
 * release notes, which this entry links to.
 *
 * Seeded at the v0.6.2 tag as `published`, so `ensurePublicationDate` stamps
 * the date at write time. It stayed `draft` until the tag so seeding it ahead
 * of the release could not put it on the public timeline.
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

const CHANGELOG_SLUG = 'v0-6-2'

const MARKDOWN = `## Every passage the assistant reads now says what it is

The assistant answers from a library of written evidence — project deep-dives, service details, interview notes, essays, and summaries of what each repository contains. Those documents are long, so each one is stored as a set of overlapping passages, and a lookup only ever sees the specific passages it retrieves. Until this release, a passage taken from the middle of a document arrived with nothing to say where it came from: no project name, no section, no sign of which offering or which article it belonged to. The assistant had to infer the subject from the surrounding prose, which is how a mechanism from one project could be attributed to another.

Every stored passage now opens by naming what it is. A section of a project deep-dive starts with the project and the topic it belongs to; a nested section also names the section above it, the way a breadcrumb does; service documents state which offering they describe; interview answers restate the question they answer; repository summaries restate the repository. This matters because the evidence here is specific — how the G-NAF autocomplete routes a broad prefix, why the Wat Wat New Zealand debt coverage never silently disagrees — and that specificity is only useful when every passage arrives with its subject attached.

## The search behind the assistant is exact and wider

The lookup had two limits, and both are gone. The first was the vector index: it was approximate by design, trading a small chance of missing the truly closest passage for speed. At the size of this library an exact scan costs milliseconds, so the search now returns the genuinely nearest passages on every query, and the ranking step can no longer receive a shortlist that never contained the answer. The second was the shortlist itself: only ten candidates were considered, so several passages of one long document could fill it and crowd out the source the question was actually about. The search now draws thirty candidates and keeps at most two passages per source before ranking, so one document can never take the shortlist over.

## Smaller things

- **The knowledge index was rebuilt** so that every stored passage carries the context described above.
- **Retrieval quality is now measured against a fixed set of questions with known sources**, stage by stage — shortlist, ranking, final evidence — so a change to how passages are ranked is verified the way a code change is.

Full technical detail is in the [v0.6.2 release notes](https://github.com/lst97-oss/last-lst97-dev/releases/tag/v0.6.2).`

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
    title: 'The assistant now reads every passage in context',
    version: 'v0.6.2',
    excerpt:
      'Every passage the assistant retrieves now states the project, section or offering it belongs to, and the search behind it returns the genuinely closest passages with no single document able to crowd out the shortlist.',
    changeTypes: ['improvement', 'maintenance'] satisfies ChangelogType[],
    tags: ['Assistant', 'Knowledge', 'Retrieval'].map((tag) => ({ tag })),
    // Published at the v0.6.2 tag. Like the v0.6.1 sibling there is no explicit
    // `publishedAt`: the hook stamps the write moment, which is already in the
    // past at read time.
    status: 'published' as const,
    featured: false,
    content,
    seo: {
      title: 'LAST//OS v0.6.2',
      description:
        'Knowledge passages now carry their project, section and offering, and the lookup behind them scans exactly with a wider shortlist no single document can fill.',
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
