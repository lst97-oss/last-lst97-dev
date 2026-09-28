import { createFileRoute } from '@tanstack/react-router'

import { PostCard } from '@/components/site/content/card'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, CountBadge, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { loadPosts } from '@/lib/content/site-data'

export const Route = createFileRoute('/_site/blog/')({
  loader: loadPosts,
  errorComponent: () => <ContentUnavailableRoute
    title="notes.directory"
    icon="✎"
    message="Notes could not be loaded from the content service. Try again in a moment."
  />,
  head: () => ({ meta: [{ title: 'Blog — LAST//OS' }, { name: 'description', content: 'Notes, observations, and experiments from the operator.' }] }),
  component: BlogPage,
})

function BlogPage() {
  const posts = Route.useLoaderData()

  return (
    <PageStack>
      <WindowFrame title="notes.directory" icon="✎">
        <PageHeading
          icon="✎"
          eyebrow="BLOG / INDEX"
          title="Notes from the field."
          lead="Small dispatches about building, learning, and noticing."
          badge={<CountBadge className="mt-4">{posts.totalDocs.toString().padStart(2, '0')} FILES</CountBadge>}
        />
        {posts.items.length > 0 ? <CardGrid className="blog-grid">{posts.items.map((post) => <PostCard key={post.slug} post={post} />)}</CardGrid> : <EmptyPanel className="min-h-82 items-center text-center"><PixelIcon glyph="◇" className="text-2xl" /><h2 className="m-0">The directory is quiet.</h2><p className="m-0">New notes will appear here when they are ready.</p></EmptyPanel>}
      </WindowFrame>
    </PageStack>
  )
}
