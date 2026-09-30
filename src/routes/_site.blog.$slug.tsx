import { createFileRoute, notFound } from '@tanstack/react-router'
import { ContentDetailLayout } from '@/components/site/content/detail-layout'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { formatPublishedDate, formatReadingTime, readingTimeMinutes } from '@/lib/content/date'
import { createContentMeta } from '@/lib/content/meta'
import { loadPost } from '@/lib/content/site-data'
import { createPostStructuredData } from '@/lib/content/structured-data'
import { canonicalUrl } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/blog/$slug')({
  errorComponent: () => <ContentUnavailableRoute
    title="note.connection"
    icon="✎"
    message="This note could not be loaded from the content service. Try again in a moment."
  />,
  loader: async ({ params }) => {
    const post = await loadPost(params.slug)
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? createContentMeta({
          title: loaderData.title,
          description: loaderData.excerpt,
          image: loaderData.coverImage,
          seo: loaderData.seo,
          kind: 'article',
          pathname: `/blog/${params.slug}`,
          publishedTime: loaderData.publishedAt,
          modifiedTime: loaderData.updatedAt,
          tags: loaderData.tags,
          structuredData: createPostStructuredData({
            title: loaderData.seo.title?.trim() || loaderData.title,
            description: loaderData.seo.description?.trim() || loaderData.excerpt,
            slug: params.slug,
            imageUrl: (loaderData.seo.image.url ?? loaderData.coverImage.url) ?? null,
            publishedTime: loaderData.publishedAt,
            modifiedTime: loaderData.updatedAt,
            tags: loaderData.tags,
            readingTimeMinutes: readingTimeMinutes(loaderData.content),
          }),
        })
      : {
          meta: [{ title: 'Note — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/blog/${params.slug}`) }],
        },
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
  const readMinutes = readingTimeMinutes(post.content)
  return (
    <ContentDetailLayout
      windowTitle={`note://${post.slug}`}
      icon="✎"
      backHref="/blog"
      backLabel="← BACK TO NOTES"
      eyebrow={`NOTE / ${formatPublishedDate(post.publishedAt)}`}
      coverImage={post.coverImage}
      title={post.title}
      excerpt={post.excerpt}
      tags={post.tags}
      topics={post.topics}
      readingTime={readMinutes ? formatReadingTime(readMinutes) : null}
      publishedAt={post.publishedAt}
      updatedAt={post.updatedAt}
    >
      <RichText value={post.content} />
    </ContentDetailLayout>
  )
}
