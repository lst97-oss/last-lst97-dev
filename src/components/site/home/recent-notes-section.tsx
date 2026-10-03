import { Link } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { PostCard } from '@/components/site/content/card'
import { homeWindowControls } from '@/components/site/home/constants'
import { CardGrid, EmptyPanel } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

type Post = ComponentProps<typeof PostCard>['post']

export function HomeRecentNotesSection({ posts }: { posts: Post[] }) {
  return (
    <WindowFrame title="latest-notes.directory" icon="✎" controls={homeWindowControls}>
      <div className="section-heading mb-5 flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <p className="eyebrow m-0 mb-3 text-xs leading-snug font-black tracking-widest text-accent uppercase">
            RECENTLY SAVED
          </p>
          <h2 className="mb-0">Notes from the field.</h2>
        </div>
        <Link className="text-link mt-4 text-xs font-black tracking-wider text-accent" to="/blog">
          VIEW ALL NOTES →
        </Link>
      </div>
      {posts.length > 0 ? (
        <CardGrid>
          {posts.slice(0, 3).map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </CardGrid>
      ) : (
        <EmptyPanel>
          <PixelIcon glyph="◇" />
          <p>No notes published yet. The editor is waiting.</p>
        </EmptyPanel>
      )}
    </WindowFrame>
  )
}
