import { createFileRoute, notFound } from '@tanstack/react-router'
import { ContentDetailLayout } from '@/components/site/content/detail-layout'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { formatPublishedDate } from '@/lib/content/date'
import { createContentMeta } from '@/lib/content/meta'
import { loadChangelog } from '@/lib/content/site-data'
import { canonicalUrl } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/changelog/$slug')({
  errorComponent: () => <ContentUnavailableRoute
    title="changelog.entry"
    icon="↻"
    message="This changelog entry could not be loaded from the content service. Try again in a moment."
  />,
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
        })
      : {
          meta: [{ title: 'Changelog — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/changelog/${params.slug}`) }],
        },
  component: ChangelogEntryPage,
})

function ChangelogEntryPage() {
  const entry = Route.useLoaderData()
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
    >
      <RichText value={entry.content} />
    </ContentDetailLayout>
  )
}
