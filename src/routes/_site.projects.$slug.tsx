import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { cn } from 'cn'
import { ContentCover } from '@/components/site/content/cover'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { Eyebrow, PageStack, ProjectStatus, pixelButtonVariants, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { createContentMeta } from '@/lib/content/meta'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '@/lib/content/project-display'
import { loadProject } from '@/lib/content/site-data'
import { safeAssetHref } from '@/lib/content/url'

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
    <PageStack className="max-w-4xl">
      <WindowFrame title={`project://${project.slug}`} icon="▤">
        <Link className="back-link mb-7 inline-block text-xs font-black tracking-wider text-accent" to="/projects">← BACK TO PROJECTS</Link>
        <ContentCover image={project.coverImage} className="content-cover content-detail-cover" />
        <Eyebrow><PixelIcon glyph="◆" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}</Eyebrow>
        <h1>{project.title}</h1>
        <p className="lead-copy">{project.summary}</p>
        {lifecycle || project.role || timeframe ? (
          <div className="project-detail-meta my-3 flex flex-wrap items-center gap-2 text-xs font-extrabold tracking-wide text-muted-foreground">
            {lifecycle ? <ProjectStatus>{lifecycle}</ProjectStatus> : null}
            {project.role ? <span>ROLE / {project.role}</span> : null}
            {timeframe ? <span>{timeframe}</span> : null}
          </div>
        ) : null}
        <TagRow className="post-tags my-6">{project.technologies.map((technology) => <Tag key={technology}>{technology}</Tag>)}</TagRow>
        <div className="project-links flex flex-wrap items-center gap-3">
          {liveUrl ? <a className={cn(pixelButtonVariants({ tone: 'coral' }))} href={liveUrl} rel="noopener noreferrer" target="_blank">VIEW LIVE <span>↗</span></a> : null}
          {repositoryUrl ? <a className={cn(pixelButtonVariants())} href={repositoryUrl} rel="noopener noreferrer" target="_blank">SOURCE CODE <span>↗</span></a> : null}
        </div>
        <div className="article-body"><RichText value={project.content} /></div>
      </WindowFrame>
    </PageStack>
  )
}
