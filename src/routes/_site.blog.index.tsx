import { createFileRoute, Link } from '@tanstack/react-router'

import { PostCard } from '@/components/site/content/card'
import { ContentPagination } from '@/components/site/content/pagination'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, CountBadge, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { BlogListSkeleton } from '@/components/ui/skeletons'
import { loadPostsPage, loadTopics } from '@/lib/content/site-data'
import { createCollectionStructuredData } from '@/lib/content/structured-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/blog/')({
  // Returns undefined when absent so a bare `/blog` keeps its clean URL:
  // returning 1 would make TanStack redirect `/blog` to `/blog?page=1`.
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const raw = search.page
    if (raw === undefined || raw === null || raw === '') return {}
    const page = Number(raw)
    return { page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1 }
  },
  // `deps` in the loader comes from loaderDeps, not from validateSearch.
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ deps }) => {
    const [posts, topics] = await Promise.all([loadPostsPage(deps.page ?? 1, 9), loadTopics()])
    return { posts, topics }
  },
  pendingComponent: () => <BlogListSkeleton />,
  errorComponent: () => (
    <ContentUnavailableRoute
      title="notes.directory"
      icon="✎"
      message="Notes could not be loaded from the content service. Try again in a moment."
    />
  ),
  head: ({ loaderData }) => {
    const description =
      'Notes, observations, and experiments from the field — dispatches about building software, learning, and noticing.'
    // Page 2+ self-canonicalises so each page is indexable in its own right;
    // otherwise every page looks like a duplicate of `/blog`. The loader echoes
    // the resolved page back, which is authoritative after validation.
    const page = loaderData?.posts.page ?? 1
    return createPageMeta({
      pathname: page > 1 ? `/blog?page=${page}` : '/blog',
      title: page > 1 ? `Blog — page ${page}` : 'Blog',
      description,
      structuredData: createCollectionStructuredData({
        pathname: '/blog',
        name: 'Blog',
        description,
        items: (loaderData?.posts.items ?? []).map((post) => ({ name: post.title, slug: post.slug })),
      }),
    })
  },
  component: BlogPage,
})

function BlogPage() {
  const { posts, topics } = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <PageStack>
      <WindowFrame title="notes.directory" icon="✎" scrollable>
        <PageHeading
          icon="✎"
          eyebrow="BLOG / INDEX"
          title="Notes from the field."
          lead="Small dispatches about building, learning, and noticing."
          badge={<CountBadge className="mt-4">{posts.totalDocs.toString().padStart(2, '0')} FILES</CountBadge>}
        />
        {topics.length > 0 ? (
          <nav aria-label="Blog topics" className="mb-6 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                className="topic-filter-link"
                key={topic.slug}
                to="/blog/topics/$slug"
                params={{ slug: topic.slug }}
              >
                {topic.title}
              </Link>
            ))}
          </nav>
        ) : null}
        {posts.items.length > 0 ? (
          <>
            <CardGrid>
              {posts.items.map((post) => (
                <PostCard headingLevel={2} key={post.slug} post={post} />
              ))}
            </CardGrid>
            <ContentPagination
              basePath="/blog"
              current={posts.page}
              label="Blog pages"
              search={search}
              totalPages={posts.totalPages}
            />
          </>
        ) : (
          <EmptyPanel className="min-h-82 items-center text-center">
            <PixelIcon glyph="◇" className="text-2xl" />
            <h2 className="m-0">The directory is quiet.</h2>
            <p className="m-0">New notes will appear here when they are ready.</p>
          </EmptyPanel>
        )}
      </WindowFrame>
    </PageStack>
  )
}
