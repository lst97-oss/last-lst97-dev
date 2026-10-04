import { createFileRoute, notFound } from '@tanstack/react-router'
import { ContentDetailLayout } from '@/components/site/content/detail-layout'
import { RelatedContent } from '@/components/site/content/related-content'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { ContentDetailSkeleton } from '@/components/ui/skeletons'
import { formatPublishedDate, formatReadingTime, readingTimeMinutes } from '@/lib/content/date'
import { createContentMeta, resolveContentShare } from '@/lib/content/meta'
import { loadPost, loadRelatedPosts } from '@/lib/content/site-data'
import { createPostStructuredData, withBreadcrumbs } from '@/lib/content/structured-data'
import { canonicalUrl } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/blog/$slug')({
  errorComponent: () => (
    <ContentUnavailableRoute
      title="note.connection"
      icon="✎"
      message="This note could not be loaded from the content service. Try again in a moment."
    />
  ),
  // The slug is unknown while pending, so the window title keeps its shape
  // with the ellipsis the real title will replace.
  pendingComponent: () => (
    <ContentDetailSkeleton backLabel="← BACK TO NOTES" badges={false} icon="✎" topics windowTitle="note://…" />
  ),
  loader: async ({ params }) => {
    const post = await loadPost(params.slug)
    if (!post) throw notFound()
    const related = await loadRelatedPosts({
      excludeSlug: post.slug,
      topicIds: post.topics?.map((topic) => topic.id) ?? [],
      limit: 3,
    })
    return { post, related }
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post
    return post
      ? createContentMeta({
          title: post.title,
          description: post.excerpt,
          image: post.coverImage,
          seo: post.seo,
          kind: 'article',
          pathname: `/blog/${params.slug}`,
          publishedTime: post.publishedAt,
          modifiedTime: post.updatedAt,
          tags: post.tags,
          structuredData: withBreadcrumbs(
            createPostStructuredData({
              title: post.seo.title?.trim() || post.title,
              description: post.seo.description?.trim() || post.excerpt,
              slug: params.slug,
              imageUrl: post.seo.image.url ?? post.coverImage.url ?? null,
              publishedTime: post.publishedAt,
              modifiedTime: post.updatedAt,
              tags: post.tags,
              readingTimeMinutes: readingTimeMinutes(post.content),
            }),
            [
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: post.title, path: `/blog/${params.slug}` },
            ],
          ),
        })
      : {
          meta: [{ title: 'Note — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/blog/${params.slug}`) }],
        }
  },
  component: PostPage,
})

function PostPage() {
  const { post, related } = Route.useLoaderData()
  const readMinutes = readingTimeMinutes(post.content)
  // The same inputs `head()` passes, so the dialog preview and the emitted
  // `og:*` tags cannot disagree.
  const share = resolveContentShare({
    title: post.title,
    description: post.excerpt,
    image: post.coverImage,
    seo: post.seo,
    pathname: `/blog/${post.slug}`,
  })
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
      wide
      updatedAt={post.updatedAt}
      share={share}
      related={<RelatedContent items={related} kind="post" />}
    >
      <RichText value={post.content} />
    </ContentDetailLayout>
  )
}
