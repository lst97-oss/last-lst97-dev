import { createFileRoute, notFound } from '@tanstack/react-router'
import { cn } from 'cn'
import { ContentCover } from '@/components/site/content/cover'
import { DetailMeta } from '@/components/site/content/detail-meta'
import { RelatedContent } from '@/components/site/content/related-content'
import { RichText } from '@/components/site/content/rich-text'
import { ContentUnavailableRoute } from '@/components/site/content/unavailable'
import { Eyebrow, PageStack, ProjectStatus, pixelButtonVariants, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { ShareDialog } from '@/components/site/share'
import { ImageGallery, MediaTrigger, toMediaItem } from '@/components/site/share/media'
import { WindowFrame } from '@/components/site/window-frame'
import { ProjectDetailSkeleton } from '@/components/ui/skeletons'
import { contentCardDate, formatReadingTime, readingTimeMinutes } from '@/lib/content/date'
import { createContentMeta, resolveContentShare } from '@/lib/content/meta'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '@/lib/content/project-display'
import { loadProject, loadRelatedProjects } from '@/lib/content/site-data'
import { createProjectStructuredData, withBreadcrumbs } from '@/lib/content/structured-data'
import { safeAssetHref } from '@/lib/content/url'
import { canonicalUrl } from '@/lib/seo/site-seo'

export const Route = createFileRoute('/_site/projects/$slug')({
  errorComponent: () => (
    <ContentUnavailableRoute
      title="project.connection"
      icon="▤"
      message="This project could not be loaded from the content service. Try again in a moment."
    />
  ),
  pendingComponent: () => <ProjectDetailSkeleton backLabel="← BACK TO PROJECTS" icon="▤" windowTitle="project://…" />,
  loader: async ({ params }) => {
    const project = await loadProject(params.slug)
    if (!project) throw notFound()
    // Topics first, recency as the top-up: most projects carry no topics at
    // all, and an empty section helps nobody.
    const related = await loadRelatedProjects({
      excludeSlug: project.slug,
      topicIds: project.topics.map((topic) => topic.id),
      limit: 3,
    })
    return { project, related }
  },
  head: ({ loaderData, params }) => {
    const project = loaderData?.project
    return project
      ? createContentMeta({
          title: project.title,
          description: project.summary,
          image: project.coverImage,
          seo: project.seo,
          kind: 'article',
          pathname: `/projects/${params.slug}`,
          // Projects have no publication date, but the record still carries a
          // created and updated timestamp; passing them gives `article:*` and
          // the JSON-LD a real freshness signal instead of nothing.
          publishedTime: project.createdAt,
          modifiedTime: project.updatedAt,
          tags: project.technologies,
          structuredData: withBreadcrumbs(
            createProjectStructuredData({
              title: project.seo.title?.trim() || project.title,
              summary: project.seo.description?.trim() || project.summary,
              slug: params.slug,
              imageUrl: project.seo.image.url ?? project.coverImage.url ?? null,
              liveUrl: project.liveUrl,
              repositoryUrl: project.repositoryUrl,
              technologies: project.technologies,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            }),
            [
              { name: 'Home', path: '/' },
              { name: 'Projects', path: '/projects' },
              { name: project.title, path: `/projects/${params.slug}` },
            ],
          ),
        })
      : {
          meta: [{ title: 'Project — LAST//OS' }],
          links: [{ rel: 'canonical', href: canonicalUrl(`/projects/${params.slug}`) }],
        }
  },
  component: ProjectPage,
})

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
  const { project, related } = Route.useLoaderData()
  const lifecycle = getProjectLifecycleLabel(project.projectStatus)
  const timeframe = formatProjectTimeframe(project.projectStatus, project.startDate, project.endDate)
  const liveUrl = safeAssetHref(project.liveUrl)
  const repositoryUrl = safeAssetHref(project.repositoryUrl)
  const coverItem = toMediaItem(project.coverImage, { altFallback: project.title })
  const readMinutes = readingTimeMinutes(project.content)
  const share = resolveContentShare({
    title: project.title,
    description: project.summary,
    image: project.coverImage,
    seo: project.seo,
    pathname: `/projects/${project.slug}`,
  })
  const projectDate = contentCardDate(project.createdAt) ?? contentCardDate(project.updatedAt)
  // `gallery` is a flat array of media documents; each one's own `alt` is the
  // caption, so the same text is the accessible name and the viewer caption.
  const mediaItems = project.gallery.flatMap((image, index) => {
    const media = toMediaItem(image, { caption: image.alt, altFallback: `${project.title} gallery image ${index + 1}` })
    return media ? [media] : []
  })

  return (
    <PageStack>
      <WindowFrame
        backLink={{ href: '/projects', label: '← BACK TO PROJECTS' }}
        title={`project://${project.slug}`}
        icon="▤"
        scrollable
      >
        <MediaTrigger item={coverItem} label={`View full size image: ${project.title}`}>
          <ContentCover image={project.coverImage} className="content-cover content-detail-cover" priority />
        </MediaTrigger>
        <Eyebrow>
          <PixelIcon glyph="◆" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}
        </Eyebrow>
        <h1>{project.title}</h1>
        <p className="lead-copy lead-copy--wide">{project.summary}</p>
        <DetailMeta created={projectDate} readingTime={readMinutes ? formatReadingTime(readMinutes) : null} />
        <ProjectFacts lifecycle={lifecycle} role={project.role} timeframe={timeframe} />
        <TagRow className="post-tags my-6">
          {project.technologies.map((technology) => (
            <Tag key={technology}>{technology}</Tag>
          ))}
        </TagRow>
        {/* Plain labels, not links: the only topic route in the app is
            /blog/topics/$slug, which lists posts. A project topic linked there
            would promise navigation that does not exist. */}
        {project.topics.length > 0 ? (
          <TagRow className="post-tags -mt-4 mb-6">
            {project.topics.map((topic) => (
              <Tag key={topic.slug}>{topic.title}</Tag>
            ))}
          </TagRow>
        ) : null}
        {project.tags.length > 0 ? (
          <TagRow className="post-tags -mt-4 mb-6">
            {project.tags.map((tag) => (
              <Tag key={tag.slug}>{tag.title}</Tag>
            ))}
          </TagRow>
        ) : null}
        <div className="project-links flex flex-wrap items-center gap-3">
          {liveUrl ? (
            <a
              className={cn(pixelButtonVariants({ tone: 'coral' }))}
              href={liveUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              VIEW LIVE <span>↗</span>
            </a>
          ) : null}
          {repositoryUrl ? (
            <a className={cn(pixelButtonVariants())} href={repositoryUrl} rel="noopener noreferrer" target="_blank">
              SOURCE CODE <span>↗</span>
            </a>
          ) : null}
          <ShareDialog {...share} />
        </div>
        <div className="article-body article-body--wide">
          <RichText value={project.content} />
        </div>
        <ImageGallery heading="Gallery" items={mediaItems} />
        <RelatedContent items={related} kind="project" />
      </WindowFrame>
    </PageStack>
  )
}
