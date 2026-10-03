import { createFileRoute, notFound } from '@tanstack/react-router'
import { ContentDetailLayout } from '@/components/site/content/detail-layout'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { ContentDetailSkeleton } from '@/components/ui/skeletons'
import { formatPublishedDate, formatReadingTime, readingTimeMinutes } from '@/lib/content/date'
import { createContentMeta } from '@/lib/content/meta'
import { loadChangelog } from '@/lib/content/site-data'
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
    return entry
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? createContentMeta({
          title: loaderData.version ? `${loaderData.version} — ${loaderData.title}` : loaderData.title,
          description: loaderData.excerpt,
          image: loaderData.coverImage,
          seo: loaderData.seo,
          kind: 'article',
          pathname: `/changelog/${params.slug}`,
          publishedTime: loaderData.publishedAt,
          tags: loaderData.tags,
          structuredData: withBreadcrumbs(
            createChangelogStructuredData({
              title: loaderData.seo.title?.trim() || loaderData.title,
              summary: loaderData.seo.description?.trim() || loaderData.excerpt,
              slug: params.slug,
              version: loaderData.version,
              imageUrl: loaderData.seo.image.url ?? loaderData.coverImage.url ?? null,
              publishedTime: loaderData.publishedAt,
              modifiedTime: loaderData.updatedAt,
              tags: loaderData.tags,
            }),
            [
              { name: 'Home', path: '/' },
              { name: 'Changelog', path: '/changelog' },
              { name: loaderData.title, path: `/changelog/${params.slug}` },
            ],
          ),
        })
      : {
          meta: [{ title: 'Changelog — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/changelog/${params.slug}`) }],
        },
  component: ChangelogEntryPage,
})

function ChangelogEntryPage() {
  const entry = Route.useLoaderData()
  const readMinutes = readingTimeMinutes(entry.content)
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
    >
      <RichText value={entry.content} />
    </ContentDetailLayout>
  )
}
