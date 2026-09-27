import { createFileRoute } from '@tanstack/react-router'

import { ProjectCard } from '../components/site/content/card'
import { ContentUnavailableRoute } from '../components/site/content/unavailable'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { loadProjects } from '../lib/content/site-data'

export const Route = createFileRoute('/_site/projects/')({
  loader: loadProjects,
  errorComponent: () => <ContentUnavailableRoute
    title="projects.archive"
    icon="▤"
    message="Projects could not be loaded from the content service. Try again in a moment."
  />,
  head: () => ({ meta: [{ title: 'Projects — LAST//OS' }, { name: 'description', content: 'Selected projects and experiments from the operator.' }] }),
  component: ProjectsPage,
})

function ProjectsPage() {
  const projects = Route.useLoaderData()
  return (
    <div className="page-stack">
      <WindowFrame title="projects.archive" icon="▤">
        <div className="page-heading"><div><p className="eyebrow"><PixelIcon glyph="▤" /> PROJECTS / ARCHIVE</p><h1>Things I’ve shipped.</h1><p className="lead-copy">A working archive of products, tools, and experiments.</p></div><span className="count-badge">{projects.length.toString().padStart(2, '0')} FILES</span></div>
        {projects.length > 0 ? <div className="card-grid project-grid">{projects.map((project) => <ProjectCard key={project.slug} project={project} />)}</div> : <div className="empty-panel large-empty"><PixelIcon glyph="◇" /><h2>Archive booting.</h2><p>Projects will appear here once the Payload workspace has its first records.</p></div>}
      </WindowFrame>
    </div>
  )
}
