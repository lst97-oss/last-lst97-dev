import { createFileRoute } from '@tanstack/react-router'

import { ProjectCard } from '@/components/site/content/card'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { CardGrid, CountBadge, EmptyPanel, PageHeading, PageStack } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { loadProjects } from '@/lib/content/site-data'
import { createPageMeta } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/projects/')({
  loader: loadProjects,
  errorComponent: () => <ContentUnavailableRoute
    title="projects.archive"
    icon="▤"
    message="Projects could not be loaded from the content service. Try again in a moment."
  />,
  head: () =>
    createPageMeta({
      pathname: '/projects',
      title: 'Projects',
      description:
        'Selected projects, products, tools, and experiments — full-stack web apps and open-source utilities built with React, TypeScript, and Next.js.',
    }),
  component: ProjectsPage,
})

function ProjectsPage() {
  const projects = Route.useLoaderData()
  return (
    <PageStack>
      <WindowFrame title="projects.archive" icon="▤">
        <PageHeading
          icon="▤"
          eyebrow="PROJECTS / ARCHIVE"
          title="Things I’ve shipped."
          lead="A working archive of products, tools, and experiments."
          badge={<CountBadge className="mt-4">{projects.length.toString().padStart(2, '0')} FILES</CountBadge>}
        />
        {projects.length > 0 ? <CardGrid className="project-grid">{projects.map((project) => <ProjectCard key={project.slug} project={project} />)}</CardGrid> : <EmptyPanel className="min-h-82 items-center text-center"><PixelIcon glyph="◇" className="text-2xl" /><h2 className="m-0">Archive booting.</h2><p className="m-0">Projects will appear here once the Payload workspace has its first records.</p></EmptyPanel>}
      </WindowFrame>
    </PageStack>
  )
}
