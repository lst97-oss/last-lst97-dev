import { createFileRoute, notFound } from '@tanstack/react-router'
import { ChangelogNeighbours } from '@/components/site/content/changelog-neighbours'
import { ContentDetailLayout } from '@/components/site/content/detail-layout'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { ContentDetailSkeleton } from '@/components/ui/skeletons'
import { formatPublishedDate, formatReadingTime, readingTimeMinutes } from '@/lib/content/date'
import { createContentMeta, resolveContentShare } from '@/lib/content/meta'
import { loadChangelog, loadChangelogNeighbours } from '@/lib/content/site-data'
import { createChangelogStructuredData, withBreadcrumbs } from '@/lib/content/structured-data'
import { canonicalUrl } from '@/lib/seo/site-seo'

const changeTypeLabels: Record<string, string> = {
  feature: 'FEATURE',
  improvement: 'IMPROVEMENT',
  bug_fix: 'BUG FIX',
  security: 'SECURITY',
  breaking_change: 'BREAKING',
  maintenance: 'MAINTENANCE',
  documentation: 'DOCS',
}

/**
 * The changelog's head title is version-prefixed. `head()` and the component
 * both build it through here, so the share preview cannot show the bare entry
 * title while `og:title` shows the version-prefixed one.
 */
function entryTitle(entry: { title: string; version: string | null }): string {
  return entry.version ? `${entry.version} — ${entry.title}` : entry.title
}

export const Route = createFileRoute('/_site/changelog/$slug')({
  errorComponent: () => (
    <ContentUnavailableRoute
      title="changelog.entry"
      icon="↻"
      message="This changelog entry could not be loaded from the content service. Try again in a moment."
    />
  ),
  // Change types fill the badges row; a note's topics row is absent here.
  pendingComponent: () => (
    <ContentDetailSkeleton backLabel="← BACK TO CHANGELOG" badges icon="↻" topics={false} windowTitle="changelog://…" />
  ),
  loader: async ({ params }) => {
    const entry = await loadChangelog(params.slug)
    if (!entry) throw notFound()
    const neighbours = await loadChangelogNeighbours(entry.slug)
    return { entry, neighbours }
  },
  head: ({ loaderData, params }) => {
    const entry = loaderData?.entry
    return entry
      ? createContentMeta({
          title: entryTitle(entry),
          description: entry.excerpt,
          image: entry.coverImage,
          seo: entry.seo,
          kind: 'article',
          pathname: `/changelog/${params.slug}`,
          publishedTime: entry.publishedAt,
          tags: entry.tags,
          structuredData: withBreadcrumbs(
            createChangelogStructuredData({
              title: entry.seo.title?.trim() || entry.title,
              summary: entry.seo.description?.trim() || entry.excerpt,
              slug: params.slug,
              version: entry.version,
              imageUrl: entry.seo.image.url ?? entry.coverImage.url ?? null,
              publishedTime: entry.publishedAt,
              modifiedTime: entry.updatedAt,
              tags: entry.tags,
            }),
            [
              { name: 'Home', path: '/' },
              { name: 'Changelog', path: '/changelog' },
              { name: entry.title, path: `/changelog/${params.slug}` },
            ],
          ),
        })
      : {
          meta: [{ title: 'Changelog — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/changelog/${params.slug}`) }],
        }
  },
  component: ChangelogEntryPage,
})

function ChangelogEntryPage() {
  const { entry, neighbours } = Route.useLoaderData()
  const readMinutes = readingTimeMinutes(entry.content)
  const share = resolveContentShare({
    title: entryTitle(entry),
    description: entry.excerpt,
    image: entry.coverImage,
    seo: entry.seo,
    pathname: `/changelog/${entry.slug}`,
  })
  return (
    <ContentDetailLayout
      windowTitle={`changelog://${entry.slug}`}
      icon="↻"
      backHref="/changelog"
      backLabel="← BACK TO CHANGELOG"
      eyebrow={`CHANGELOG / ${formatPublishedDate(entry.publishedAt)}${entry.version ? ` / ${entry.version}` : ''}`}
      coverImage={entry.coverImage}
      title={entry.title}
      excerpt={entry.excerpt}
      tags={entry.tags}
      topics={[]}
      badges={entry.changeTypes.map((type) => changeTypeLabels[type] ?? type)}
      readingTime={readMinutes ? formatReadingTime(readMinutes) : null}
      publishedAt={entry.publishedAt}
      wide
      updatedAt={entry.updatedAt}
      share={share}
      related={<ChangelogNeighbours {...neighbours} />}
    >
      <RichText value={entry.content} />
    </ContentDetailLayout>
  )
}
