import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { RichText } from '../components/site/content/rich-text'
import { ContentCover } from '../components/site/content/cover'
import { ContentUnavailableRoute } from '../components/site/content/unavailable'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { createContentMeta } from '../lib/content-meta'
import { formatPublishedDate } from '../lib/content-date'
import { loadChangelog } from '../lib/site-data'

export const Route = createFileRoute('/_site/changelog/$slug')({
  errorComponent: () => <ContentUnavailableRoute
    title="changelog.entry"
    icon="↻"
    message="This changelog entry could not be loaded from the content service. Try again in a moment."
  />,
  loader: async ({ params }) => {
    const entry = await loadChangelog(params.slug)
    if (!entry) throw notFound()
    return entry
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? createContentMeta({
          title: loaderData.version ? `${loaderData.version} — ${loaderData.title}` : loaderData.title,
          description: loaderData.excerpt,
          image: loaderData.coverImage,
          seo: loaderData.seo,
          kind: 'article',
        })
      : [{ title: 'Changelog — LAST//OS' }],
  }),
  component: ChangelogEntryPage,
})

function ChangelogEntryPage() {
  const entry = Route.useLoaderData()
  return (
    <div className="page-stack narrow-page">
      <WindowFrame title={`changelog://${entry.slug}`} icon="↻">
        <Link className="back-link" to="/changelog">← BACK TO CHANGELOG</Link>
        <ContentCover image={entry.coverImage} className="content-cover content-detail-cover" />
        <p className="eyebrow">
          <PixelIcon glyph="●" /> CHANGELOG / {formatPublishedDate(entry.publishedAt)}
          {entry.version ? ` / ${entry.version}` : null}
        </p>
        <h1>{entry.title}</h1>
        <p className="lead-copy">{entry.excerpt}</p>
        <div className="tag-row post-tags">{entry.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="article-body"><RichText value={entry.content} /></div>
      </WindowFrame>
    </div>
  )
}
