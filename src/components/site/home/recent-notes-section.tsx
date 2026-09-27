import { Link } from '@tanstack/react-router'
import type { ComponentProps } from 'react'

import { PostCard } from '../content/card'
import { PixelIcon } from '../pixel-icon'
import { WindowFrame } from '../window-frame'
import { homeWindowControls } from './constants'

type Post = ComponentProps<typeof PostCard>['post']

export function HomeRecentNotesSection({ posts }: { posts: Post[] }) {
  return (
    <WindowFrame title="latest-notes.directory" icon="✎" controls={homeWindowControls}>
      <div className="section-heading"><div><p className="eyebrow">RECENTLY SAVED</p><h2>Notes from the field.</h2></div><Link className="text-link" to="/blog">VIEW ALL NOTES →</Link></div>
      {posts.length > 0
        ? <div className="card-grid">{posts.slice(0, 3).map((post) => <PostCard key={post.slug} post={post} />)}</div>
        : <div className="empty-panel"><PixelIcon glyph="◇" /><p>No notes published yet. The editor is waiting.</p></div>}
    </WindowFrame>
  )
}
