import { createFileRoute } from '@tanstack/react-router'

import { PostCard } from '../components/site/content/card'
import { ContentUnavailableRoute } from '../components/site/content/unavailable'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { loadPosts } from '../lib/content/site-data'

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
    <div className="page-stack">
      <WindowFrame title="notes.directory" icon="✎">
        <div className="page-heading"><div><p className="eyebrow"><PixelIcon glyph="✎" /> BLOG / INDEX</p><h1>Notes from the field.</h1><p className="lead-copy">Small dispatches about building, learning, and noticing.</p></div><span className="count-badge">{posts.totalDocs.toString().padStart(2, '0')} FILES</span></div>
        {posts.items.length > 0 ? <div className="card-grid blog-grid">{posts.items.map((post) => <PostCard key={post.slug} post={post} />)}</div> : <div className="empty-panel large-empty"><PixelIcon glyph="◇" /><h2>The directory is quiet.</h2><p>New notes will appear here when they are ready.</p></div>}
      </WindowFrame>
    </div>
  )
}
