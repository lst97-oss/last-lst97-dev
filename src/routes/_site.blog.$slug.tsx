import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { RichText } from '../components/site/content/rich-text'
import { ContentCover } from '../components/site/content/cover'
import { ContentUnavailableRoute } from '../components/site/content/unavailable'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { createContentMeta } from '../lib/content-meta'
import { formatPublishedDate } from '../lib/content-date'
import { loadPost } from '../lib/site-data'

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
  head: ({ loaderData }) => ({
    meta: loaderData
      ? createContentMeta({
          title: loaderData.title,
          description: loaderData.excerpt,
          image: loaderData.coverImage,
          seo: loaderData.seo,
          kind: 'article',
        })
      : [{ title: 'Note — LAST//OS' }],
  }),
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
  return (
    <div className="page-stack narrow-page">
      <WindowFrame title={`note://${post.slug}`} icon="✎">
        <Link className="back-link" to="/blog">← BACK TO NOTES</Link>
        <ContentCover image={post.coverImage} className="content-cover content-detail-cover" />
        <p className="eyebrow"><PixelIcon glyph="●" /> NOTE / {formatPublishedDate(post.publishedAt)}</p>
        <h1>{post.title}</h1>
        <p className="lead-copy">{post.excerpt}</p>
        <div className="tag-row post-tags">{post.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="article-body"><RichText value={post.content} /></div>
      </WindowFrame>
    </div>
  )
}
