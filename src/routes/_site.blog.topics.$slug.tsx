import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { PostCard } from '@/components/site/content/card'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { loadPostsByTopic, loadTopic, loadTopics } from '@/lib/content/site-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/blog/topics/$slug')({
  loader: async ({ params }) => {
    const topic = await loadTopic(params.slug)
    if (!topic) throw notFound()
    const [posts, topics] = await Promise.all([loadPostsByTopic(topic.id), loadTopics()])
    return { topic, posts, topics }
  },
  errorComponent: () => (
    <ContentUnavailableRoute
      title="topic.directory"
      icon="◇"
      message="This topic could not be loaded. Try again in a moment."
    />
  ),
  head: ({ loaderData, params }) =>
    createPageMeta({
      pathname: `/blog/topics/${params.slug}`,
      title: loaderData?.topic.title ?? 'Blog topic',
      description: loaderData?.topic.description || `Notes filed under ${loaderData?.topic.title ?? 'this topic'}.`,
    }),
  component: TopicPage,
})

function TopicPage() {
  const { topic, posts, topics } = Route.useLoaderData()
  return (
    <PageStack>
      <WindowFrame title={`topic://${topic.slug}`} icon="◇" scrollable>
        <Link className="back-link mb-7 inline-block text-xs font-black tracking-wider text-accent" to="/blog">
          ← BACK TO NOTES
        </Link>
        <PageHeading
          icon="◇"
          eyebrow="BLOG / TOPIC"
          title={topic.title}
          lead={topic.description || `Notes filed under ${topic.title}.`}
        />
        <nav aria-label="Blog topics" className="mb-6 flex flex-wrap gap-2">
          <Link className="topic-filter-link" to="/blog">
            All notes
          </Link>
          {topics.map((item) => (
            <Link className="topic-filter-link" key={item.slug} to="/blog/topics/$slug" params={{ slug: item.slug }}>
              {item.title}
            </Link>
          ))}
        </nav>
        {posts.items.length ? (
          <CardGrid>
            {posts.items.map((post) => (
              <PostCard headingLevel={2} key={post.slug} post={post} />
            ))}
          </CardGrid>
        ) : (
          <EmptyPanel className="min-h-82 items-center text-center">
            <PixelIcon glyph="◇" className="text-2xl" />
            <h2 className="m-0">No notes in this topic yet.</h2>
            <p className="m-0">Published notes will appear here.</p>
          </EmptyPanel>
        )}
      </WindowFrame>
    </PageStack>
  )
}
