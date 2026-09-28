import { createFileRoute, Link } from '@tanstack/react-router'

import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CountBadge, EmptyPanel, PageHeading, PageStack, ProjectStatus, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { formatPublishedDate } from '@/lib/content/date'
import { loadChangelogs } from '@/lib/content/site-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/changelog/')({
  loader: loadChangelogs,
  errorComponent: () => <ContentUnavailableRoute
    title="changelog.log"
    icon="↻"
    message="Changelog could not be loaded from the content service. Try again in a moment."
  />,
  head: () =>
    createPageMeta({
      pathname: '/changelog',
      title: 'Changelog',
      description:
        'Release notes and system updates from the operator — what shipped, what changed, and what got fixed.',
    }),
  component: ChangelogPage,
})

function ChangelogPage() {
  const changelogs = Route.useLoaderData()

  return (
    <PageStack>
      <WindowFrame title="changelog.log" icon="↻">
        <PageHeading
          icon="↻"
          eyebrow="SYSTEM / CHANGELOG"
          title="Release notes."
          lead="What shipped, what changed, and what got fixed."
          badge={<CountBadge className="mt-4">{changelogs.totalDocs.toString().padStart(2, '0')} ENTRIES</CountBadge>}
        />
        {changelogs.items.length > 0 ? (
          <ol className="changelog-timeline m-0 flex list-none flex-col p-0">
            {changelogs.items.map((entry) => (
              <li className="changelog-entry" key={entry.slug}>
                <span className="changelog-rail" aria-hidden="true"><span className="changelog-dot" /></span>
                <article className="changelog-body mb-4 border-3 border-border bg-card p-4 shadow-os-sm sm:p-5">
                  <div className="changelog-meta mb-2.5 flex flex-wrap items-center gap-2">
                    {entry.version ? <ProjectStatus>{entry.version}</ProjectStatus> : null}
                    <span className="changelog-date text-xs font-extrabold tracking-wider text-muted-foreground">{formatPublishedDate(entry.publishedAt)}</span>
                  </div>
                  <Link className="changelog-title mb-2 inline-block text-xl font-black tracking-tight text-foreground hover:text-accent hover:underline hover:decoration-2" to="/changelog/$slug" params={{ slug: entry.slug }}>
                    {entry.title}
                  </Link>
                  <p className="changelog-excerpt m-0 mb-3 text-sm text-muted-foreground">{entry.excerpt}</p>
                  {entry.tags.length > 0 ? (
                    <TagRow>
                      {entry.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    </TagRow>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyPanel className="min-h-82 items-center text-center">
            <PixelIcon glyph="◇" className="text-2xl" />
            <h2 className="m-0">No releases logged yet.</h2>
            <p className="m-0">New entries will appear here once the changelog has its first published record.</p>
          </EmptyPanel>
        )}
      </WindowFrame>
    </PageStack>
  )
}
