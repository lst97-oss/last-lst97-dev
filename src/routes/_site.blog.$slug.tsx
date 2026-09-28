import { createFileRoute, notFound } from '@tanstack/react-router'
import { ContentDetailLayout } from '@/components/site/content/detail-layout'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { formatPublishedDate } from '@/lib/content/date'
import { createContentMeta } from '@/lib/content/meta'
import { loadPost } from '@/lib/content/site-data'
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
          tags: loaderData.tags,
        })
      : {
          meta: [{ title: 'Note — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/blog/${params.slug}`) }],
        },
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
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
    >
      <RichText value={post.content} />
    </ContentDetailLayout>
  )
}
