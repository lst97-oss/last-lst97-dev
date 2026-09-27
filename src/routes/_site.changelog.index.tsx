import { createFileRoute, Link } from '@tanstack/react-router'

import { ContentUnavailableRoute } from '../components/site/content/unavailable'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { formatPublishedDate } from '../lib/content/date'
import { loadChangelogs } from '../lib/content/site-data'

export const Route = createFileRoute('/_site/changelog/')({
  loader: loadChangelogs,
  errorComponent: () => <ContentUnavailableRoute
    title="changelog.log"
    icon="↻"
    message="Changelog could not be loaded from the content service. Try again in a moment."
  />,
  head: () => ({ meta: [{ title: 'Changelog — LAST//OS' }, { name: 'description', content: 'Release notes and system updates from the operator.' }] }),
  component: ChangelogPage,
})

function ChangelogPage() {
  const changelogs = Route.useLoaderData()

  return (
    <div className="page-stack">
      <WindowFrame title="changelog.log" icon="↻">
        <div className="page-heading">
          <div>
            <p className="eyebrow"><PixelIcon glyph="↻" /> SYSTEM / CHANGELOG</p>
            <h1>Release notes.</h1>
            <p className="lead-copy">What shipped, what changed, and what got fixed.</p>
          </div>
          <span className="count-badge">{changelogs.totalDocs.toString().padStart(2, '0')} ENTRIES</span>
        </div>
        {changelogs.items.length > 0 ? (
          <ol className="changelog-timeline">
            {changelogs.items.map((entry) => (
              <li className="changelog-entry" key={entry.slug}>
                <span className="changelog-rail" aria-hidden="true"><span className="changelog-dot" /></span>
                <article className="changelog-body">
                  <div className="changelog-meta">
                    {entry.version ? <span className="project-status">{entry.version}</span> : null}
                    <span className="changelog-date">{formatPublishedDate(entry.publishedAt)}</span>
                  </div>
                  <Link className="changelog-title" to="/changelog/$slug" params={{ slug: entry.slug }}>
                    {entry.title}
                  </Link>
                  <p className="changelog-excerpt">{entry.excerpt}</p>
                  {entry.tags.length > 0 ? (
                    <div className="tag-row">
                      {entry.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                    </div>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-panel large-empty">
            <PixelIcon glyph="◇" />
            <h2>No releases logged yet.</h2>
            <p>New entries will appear here once the changelog has its first published record.</p>
          </div>
        )}
      </WindowFrame>
    </div>
  )
}
