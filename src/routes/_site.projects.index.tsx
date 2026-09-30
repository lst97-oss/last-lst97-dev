import { createFileRoute } from '@tanstack/react-router'

import { ProjectCard } from '@/components/site/content/card'
import { ContentPagination } from '@/components/site/content/pagination'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, CountBadge, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { loadProjectsPage } from '@/lib/content/site-data'
import { createCollectionStructuredData } from '@/lib/content/structured-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/projects/')({
  // Returns undefined when absent so a bare `/projects` keeps its clean URL:
  // returning 1 would make TanStack redirect `/projects` to `/projects?page=1`.
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const raw = search.page
    if (raw === undefined || raw === null || raw === '') return {}
    const page = Number(raw)
    return { page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1 }
  },
  // `deps` in the loader comes from loaderDeps, not from validateSearch.
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ deps }) => loadProjectsPage(deps.page ?? 1, 9),
  errorComponent: () => <ContentUnavailableRoute
    title="projects.archive"
    icon="▤"
    message="Projects could not be loaded from the content service. Try again in a moment."
  />,
  head: ({ loaderData }) => {
    const description =
      'Selected projects, products, tools, and experiments — full-stack web apps and open-source utilities built with React, TypeScript, and Next.js.'
    // Self-canonicalise page 2+ so each archive page is indexable in its own
    // right rather than collapsing into a duplicate of `/projects`.
    const page = loaderData?.page ?? 1
    return createPageMeta({
      pathname: page > 1 ? `/projects?page=${page}` : '/projects',
      title: page > 1 ? `Projects — page ${page}` : 'Projects',
      description,
      structuredData: createCollectionStructuredData({
        pathname: '/projects',
        name: 'Projects',
        description,
        items: (loaderData?.items ?? []).map((project) => ({ name: project.title, slug: project.slug })),
      }),
    })
  },
  component: ProjectsPage,
})

function ProjectsPage() {
  const { items: projects, page, totalPages, totalDocs } = Route.useLoaderData()
  const search = Route.useSearch()
  return (
    <PageStack>
      <WindowFrame title="projects.archive" icon="▤" scrollable>
        <PageHeading
          icon="▤"
          eyebrow="PROJECTS / ARCHIVE"
          title="Things I’ve shipped."
          lead="A working archive of products, tools, and experiments."
          badge={<CountBadge className="mt-4">{totalDocs.toString().padStart(2, '0')} FILES</CountBadge>}
        />
        {projects.length > 0 ? <><CardGrid>{projects.map((project) => <ProjectCard key={project.slug} project={project} />)}</CardGrid><ContentPagination basePath="/projects" current={page} label="Project pages" search={search} totalPages={totalPages} /></> : <EmptyPanel className="min-h-82 items-center text-center"><PixelIcon glyph="◇" className="text-2xl" /><h2 className="m-0">Archive booting.</h2><p className="m-0">Projects will appear here once the Payload workspace has its first records.</p></EmptyPanel>}
      </WindowFrame>
    </PageStack>
  )
}
