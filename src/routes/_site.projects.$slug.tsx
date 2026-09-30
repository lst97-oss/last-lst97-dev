import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { cn } from 'cn'
import { ContentCover } from '@/components/site/content/cover'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { Eyebrow, PageStack, ProjectStatus, pixelButtonVariants, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { ImageGallery, MediaTrigger, toMediaItem } from '@/components/site/share/media'
import { WindowFrame } from '@/components/site/window-frame'
import { contentCardDate, formatReadingTime, readingTimeMinutes } from '@/lib/content/date'
import { createContentMeta } from '@/lib/content/meta'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '@/lib/content/project-display'
import { loadProject } from '@/lib/content/site-data'
import { createProjectStructuredData } from '@/lib/content/structured-data'
import { safeAssetHref } from '@/lib/content/url'
import { canonicalUrl } from '@/lib/seo/site-seo'

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
  head: ({ loaderData, params }) =>
    loaderData
      ? createContentMeta({
          title: loaderData.title,
          description: loaderData.summary,
          image: loaderData.coverImage,
          seo: loaderData.seo,
          kind: 'article',
          pathname: `/projects/${params.slug}`,
          // Projects have no publication date, but the record still carries a
          // created and updated timestamp; passing them gives `article:*` and
          // the JSON-LD a real freshness signal instead of nothing.
          publishedTime: loaderData.createdAt,
          modifiedTime: loaderData.updatedAt,
          tags: loaderData.technologies,
          structuredData: createProjectStructuredData({
            title: loaderData.seo.title?.trim() || loaderData.title,
            summary: loaderData.seo.description?.trim() || loaderData.summary,
            slug: params.slug,
            imageUrl: (loaderData.seo.image.url ?? loaderData.coverImage.url) ?? null,
            liveUrl: loaderData.liveUrl,
            repositoryUrl: loaderData.repositoryUrl,
            technologies: loaderData.technologies,
            createdAt: loaderData.createdAt,
            updatedAt: loaderData.updatedAt,
          }),
        })
      : {
          meta: [{ title: 'Project — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/projects/${params.slug}`) }],
        },
  component: ProjectPage,
})

/**
 * The byline strip, rendered only when the project has at least one field to
 * show. Extracted so the page component stays a composition of the sections it
 * renders rather than a chain of conditionals.
 */
function ProjectMeta({ projectDate, readMinutes }: { projectDate: string | null; readMinutes: number | null }) {
  if (!projectDate && !readMinutes) return null

  return (
    <div className="detail-meta mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-black tracking-widest text-muted-foreground uppercase">
      {projectDate ? <span>CREATED / {projectDate}</span> : null}
      {readMinutes ? <span>{formatReadingTime(readMinutes)}</span> : null}
    </div>
  )
}

/** Lifecycle, role, and timeframe — each optional, the whole row conditional. */
function ProjectFacts({
  lifecycle,
  role,
  timeframe,
}: {
  lifecycle: string | null
  role: string | null
  timeframe: string | null
}) {
  if (!lifecycle && !role && !timeframe) return null

  return (
    <div className="project-detail-meta my-3 flex flex-wrap items-center gap-2 text-xs font-extrabold tracking-wide text-muted-foreground">
      {lifecycle ? <ProjectStatus>{lifecycle}</ProjectStatus> : null}
      {role ? <span>ROLE / {role}</span> : null}
      {timeframe ? <span>{timeframe}</span> : null}
    </div>
  )
}

function ProjectPage() {
  const project = Route.useLoaderData()
  const lifecycle = getProjectLifecycleLabel(project.projectStatus)
  const timeframe = formatProjectTimeframe(project.projectStatus, project.startDate, project.endDate)
  const liveUrl = safeAssetHref(project.liveUrl)
  const repositoryUrl = safeAssetHref(project.repositoryUrl)
  const coverItem = toMediaItem(project.coverImage, { altFallback: project.title })
  const readMinutes = readingTimeMinutes(project.content)
  const projectDate = contentCardDate(project.createdAt) ?? contentCardDate(project.updatedAt)
  // `gallery` is a flat array of media documents; each one's own `alt` is the
  // caption, so the same text is the accessible name and the viewer caption.
  const mediaItems = project.gallery.flatMap((image, index) => {
    const media = toMediaItem(image, { caption: image.alt, altFallback: `${project.title} gallery image ${index + 1}` })
    return media ? [media] : []
  })

  return (
    <PageStack>
      <WindowFrame title={`project://${project.slug}`} icon="▤" scrollable>
        <Link className="back-link mb-7 inline-block text-xs font-black tracking-wider text-accent" to="/projects">← BACK TO PROJECTS</Link>
        <MediaTrigger item={coverItem} label={`View full size image: ${project.title}`}>
          <ContentCover image={project.coverImage} className="content-cover content-detail-cover" priority />
        </MediaTrigger>
        <Eyebrow><PixelIcon glyph="◆" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}</Eyebrow>
        <h1>{project.title}</h1>
        <p className="lead-copy lead-copy--wide">{project.summary}</p>
        <ProjectMeta projectDate={projectDate} readMinutes={readMinutes} />
        <ProjectFacts lifecycle={lifecycle} role={project.role} timeframe={timeframe} />
        <TagRow className="post-tags my-6">{project.technologies.map((technology) => <Tag key={technology}>{technology}</Tag>)}</TagRow>
        <div className="project-links flex flex-wrap items-center gap-3">
          {liveUrl ? <a className={cn(pixelButtonVariants({ tone: 'coral' }))} href={liveUrl} rel="noopener noreferrer" target="_blank">VIEW LIVE <span>↗</span></a> : null}
          {repositoryUrl ? <a className={cn(pixelButtonVariants())} href={repositoryUrl} rel="noopener noreferrer" target="_blank">SOURCE CODE <span>↗</span></a> : null}
        </div>
        <div className="article-body article-body--wide"><RichText value={project.content} /></div>
        <ImageGallery heading="Gallery" items={mediaItems} />
      </WindowFrame>
    </PageStack>
  )
}
