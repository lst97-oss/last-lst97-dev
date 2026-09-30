import { createFileRoute } from '@tanstack/react-router'

import { ChangelogCard } from '@/components/site/content/card'
import { ContentPagination } from '@/components/site/content/pagination'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, CountBadge, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { loadChangelogsPage } from '@/lib/content/site-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/changelog/')({
  // Returns undefined when absent so a bare `/changelog` keeps its clean URL:
  // returning 1 would redirect `/changelog` to `/changelog?page=1`.
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const raw = search.page
    if (raw === undefined || raw === null || raw === '') return {}
    const page = Number(raw)
    return { page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1 }
  },
  // `deps` in the loader comes from loaderDeps, not from validateSearch.
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ deps }) => loadChangelogsPage(deps.page ?? 1, 9),
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
  const search = Route.useSearch()

  return (
    <PageStack>
      <WindowFrame title="changelog.log" icon="↻" scrollable>
        <PageHeading
          icon="↻"
          eyebrow="SYSTEM / CHANGELOG"
          title="Release notes."
          lead="What shipped, what changed, and what got fixed."
          badge={<CountBadge className="mt-4">{changelogs.totalDocs.toString().padStart(2, '0')} ENTRIES</CountBadge>}
        />
        {changelogs.items.length > 0 ? (
          <>
            <CardGrid>
              {changelogs.items.map((entry) => (
                <ChangelogCard entry={entry} key={entry.slug} />
              ))}
            </CardGrid>
            <ContentPagination basePath="/changelog" current={changelogs.page} label="Changelog pages" search={search} totalPages={changelogs.totalPages} />
          </>
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
