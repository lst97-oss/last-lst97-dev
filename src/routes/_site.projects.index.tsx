import { createFileRoute } from '@tanstack/react-router'

import { ProjectCard } from '@/components/site/content/card'
import { ListFilters } from '@/components/site/content/list-filters'
import { ContentPagination } from '@/components/site/content/pagination'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, CountBadge, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { ProjectListSkeleton } from '@/components/ui/skeletons'
import { loadProjectsPageFiltered, loadTopics } from '@/lib/content/site-data'
import { createCollectionStructuredData } from '@/lib/content/structured-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/projects/')({
  // Returns undefined when absent so a bare `/projects` keeps its clean URL:
  // returning 1 would make TanStack redirect `/projects` to `/projects?page=1`.
  validateSearch: (search: Record<string, unknown>): { page?: number; topic?: string } => {
    const page = Number(search.page)
    const topic = typeof search.topic === 'string' && search.topic ? search.topic : undefined
    return {
      ...(Number.isFinite(page) && page >= 1 ? { page: Math.floor(page) } : {}),
      ...(topic ? { topic } : {}),
    }
  },
  // `deps` in the loader comes from loaderDeps, not from validateSearch.
  loaderDeps: ({ search }) => ({ page: search.page ?? 1, topic: search.topic }),
  loader: async ({ deps }) => {
    // Topics first: the slug in the URL must be resolved to an id before the
    // page query can filter on it. An unknown slug filters nothing rather than
    // erroring — /blog/topics/$slug is the route that 404s on a bad slug.
    const topics = await loadTopics()
    const active = deps.topic ? topics.find((topic) => topic.slug === deps.topic) : undefined
    const projects = await loadProjectsPageFiltered(deps.page ?? 1, 9, {
      topicIds: active ? [active.id] : undefined,
    })
    return { ...projects, topics, activeTopic: active?.slug }
  },
  pendingComponent: () => <ProjectListSkeleton />,
  errorComponent: () => (
    <ContentUnavailableRoute
      title="projects.archive"
      icon="▤"
      message="Projects could not be loaded from the content service. Try again in a moment."
    />
  ),
  head: ({ loaderData }) => {
    const description =
      'Selected projects, products, tools, and experiments — full-stack web apps and open-source utilities built with React, TypeScript, and Next.js.'
    // Self-canonicalise page 2+ and any filtered view, so each is indexable in
    // its own right rather than collapsing into a duplicate of `/projects`.
    const page = loaderData?.page ?? 1
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (loaderData?.activeTopic) params.set('topic', loaderData.activeTopic)
    const filtered = params.toString()
    const pathname = filtered ? `/projects?${filtered}` : '/projects'
    return createPageMeta({
      pathname,
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
  const { items: projects, page, totalPages, totalDocs, topics, activeTopic } = Route.useLoaderData()
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
        <ListFilters activeTopic={activeTopic} to="/projects" topics={topics} what="projects" />
        {projects.length > 0 ? (
          <>
            <CardGrid>
              {projects.map((project) => (
                <ProjectCard headingLevel={2} key={project.slug} project={project} />
              ))}
            </CardGrid>
            <ContentPagination
              basePath="/projects"
              current={page}
              label="Project pages"
              search={search}
              totalPages={totalPages}
            />
          </>
        ) : (
          <EmptyPanel className="min-h-82 items-center text-center">
            <PixelIcon glyph="◇" className="text-2xl" />
            <h2 className="m-0">{activeTopic ? 'Nothing in this topic.' : 'Archive booting.'}</h2>
            <p className="m-0">
              {activeTopic
                ? 'Try a different topic, or use the All chip to see the whole archive.'
                : 'Projects will appear here once the Payload workspace has its first records.'}
            </p>
          </EmptyPanel>
        )}
      </WindowFrame>
    </PageStack>
  )
}
