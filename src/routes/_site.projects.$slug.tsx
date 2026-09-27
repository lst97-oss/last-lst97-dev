import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { RichText } from '../components/site/content/rich-text'
import { ContentCover } from '../components/site/content/cover'
import { ContentUnavailableRoute } from '../components/site/content/unavailable'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { createContentMeta } from '../lib/content-meta'
import { safeAssetHref } from '../lib/content-url'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '../lib/project-display'
import { loadProject } from '../lib/site-data'

export const Route = createFileRoute('/_site/projects/$slug')({
  errorComponent: () => <ContentUnavailableRoute
    title="project.connection"
    icon="▤"
    message="This project could not be loaded from the content service. Try again in a moment."
  />,
  loader: async ({ params }) => {
    const project = await loadProject(params.slug)
    if (!project) throw notFound()
    return project
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? createContentMeta({
          title: loaderData.title,
          description: loaderData.summary,
          image: loaderData.coverImage,
          seo: loaderData.seo,
          kind: 'article',
        })
      : [{ title: 'Project — LAST//OS' }],
  }),
  component: ProjectPage,
})

function ProjectPage() {
  const project = Route.useLoaderData()
  const lifecycle = getProjectLifecycleLabel(project.projectStatus)
  const timeframe = formatProjectTimeframe(project.projectStatus, project.startDate, project.endDate)
  const liveUrl = safeAssetHref(project.liveUrl)
  const repositoryUrl = safeAssetHref(project.repositoryUrl)

  return (
    <div className="page-stack narrow-page">
      <WindowFrame title={`project://${project.slug}`} icon="▤">
        <Link className="back-link" to="/projects">← BACK TO PROJECTS</Link>
        <ContentCover image={project.coverImage} className="content-cover content-detail-cover" />
        <p className="eyebrow"><PixelIcon glyph="◆" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}</p>
        <h1>{project.title}</h1>
        <p className="lead-copy">{project.summary}</p>
        {lifecycle || project.role || timeframe ? (
          <div className="project-detail-meta">
            {lifecycle ? <span className="project-status">{lifecycle}</span> : null}
            {project.role ? <span>ROLE / {project.role}</span> : null}
            {timeframe ? <span>{timeframe}</span> : null}
          </div>
        ) : null}
        <div className="tag-row post-tags">{project.technologies.map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div>
        <div className="project-links">
          {liveUrl ? <a className="pixel-button primary" href={liveUrl} rel="noopener noreferrer" target="_blank">VIEW LIVE <span>↗</span></a> : null}
          {repositoryUrl ? <a className="pixel-button" href={repositoryUrl} rel="noopener noreferrer" target="_blank">SOURCE CODE <span>↗</span></a> : null}
        </div>
        <div className="article-body"><RichText value={project.content} /></div>
      </WindowFrame>
    </div>
  )
}
