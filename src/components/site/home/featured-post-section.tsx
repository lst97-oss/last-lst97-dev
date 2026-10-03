import { Link } from '@tanstack/react-router'
import { ContentCover } from '@/components/site/content/cover'
import { homeWindowControls } from '@/components/site/home/constants'
import { Tag, TagRow } from '@/components/site/os-ui'
import { WindowFrame } from '@/components/site/window-frame'
import { formatPublishedDate } from '@/lib/content/date'
import type { PostSummary } from '@/server/content/types'

export function HomeFeaturedPostSection({ post }: { post: PostSummary }) {
  return (
    <WindowFrame title="featured-note.exe" icon="✎" controls={homeWindowControls}>
      <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
        <Link
          className="block"
          to="/blog/$slug"
          params={{ slug: post.slug }}
          aria-label={`Read featured note: ${post.title}`}
        >
          <ContentCover image={post.coverImage} className="content-cover aspect-video" priority />
        </Link>
        <div>
          <p className="eyebrow m-0 mb-3 text-xs font-black tracking-widest text-accent">
            FEATURED NOTE / {formatPublishedDate(post.publishedAt)}
          </p>
          <h2 className="mb-2">
            <Link className="text-foreground hover:text-accent" to="/blog/$slug" params={{ slug: post.slug }}>
              {post.title}
            </Link>
          </h2>
          <p className="m-0 mb-4 text-muted-foreground">{post.excerpt}</p>
          {post.topics && post.topics.length > 0 ? (
            <TagRow className="mb-4">
              {post.topics.map((topic) => (
                <Link key={topic.slug} to="/blog/topics/$slug" params={{ slug: topic.slug }}>
                  <Tag>{topic.title}</Tag>
                </Link>
              ))}
            </TagRow>
          ) : null}
          <Link
            className="text-link text-xs font-black tracking-wider text-accent"
            to="/blog/$slug"
            params={{ slug: post.slug }}
          >
            READ FEATURED NOTE →
          </Link>
        </div>
      </div>
    </WindowFrame>
  )
}
