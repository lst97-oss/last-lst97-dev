import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { ContentCover } from '@/components/site/content/cover'
import { CardLink, ProjectStatus, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { formatPublishedDate } from '@/lib/content/date'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '@/lib/content/project-display'
import type { ChangelogSummary, PostSummary, ProjectSummary } from '@/server/content/types'

const cardClass =
  'content-card flex min-h-50 flex-col items-start border-3 border-border bg-card p-5 shadow-none transition-all duration-100 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-warning-muted'

const kickerClass = 'card-kicker text-xs font-black tracking-widest text-accent uppercase'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link className={cardClass} to="/blog/$slug" params={{ slug: post.slug }}>
      <div className={kickerClass}>
        <PixelIcon glyph="✎" /> NOTE / {formatPublishedDate(post.publishedAt)}
      </div>
      <ContentCover image={post.coverImage} className="content-cover card-cover" />
      <h3 className="mb-2 text-2xl">{post.title}</h3>
      <p className="mb-4 text-muted-foreground">{post.excerpt}</p>
      {post.tags.length > 0 ? (
        <TagRow className="mb-3">
          {post.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
        </TagRow>
      ) : null}
      <CardLink>READ NOTE →</CardLink>
    </Link>
  )
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const lifecycle = getProjectLifecycleLabel(project.projectStatus)
  const timeframe = formatProjectTimeframe(project.projectStatus, project.startDate, project.endDate)

  return (
    <Link className={cn(cardClass, 'project-card')} to="/projects/$slug" params={{ slug: project.slug }}>
      <div className={kickerClass}>
        <PixelIcon glyph="▤" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}
      </div>
      <ContentCover image={project.coverImage} className="content-cover card-cover" />
      {lifecycle || timeframe ? (
        <div className="project-card-meta my-3 flex flex-wrap items-center gap-2 text-xs font-black tracking-wide text-muted-foreground">
          {lifecycle ? <ProjectStatus>{lifecycle}</ProjectStatus> : null}
          {timeframe ? <span>{timeframe}</span> : null}
        </div>
      ) : null}
      <h3 className="mb-2 text-2xl">{project.title}</h3>
      <p className="mb-4 text-muted-foreground">{project.summary}</p>
      <TagRow className="mb-3">
        {project.technologies.slice(0, 4).map((technology) => (
          <Tag key={technology}>{technology}</Tag>
        ))}
      </TagRow>
      <CardLink>OPEN PROJECT →</CardLink>
    </Link>
  )
}

export function ChangelogCard({ entry }: { entry: ChangelogSummary }) {
  return (
    <Link className={cn(cardClass, 'changelog-card')} to="/changelog/$slug" params={{ slug: entry.slug }}>
      <div className={kickerClass}>
        <PixelIcon glyph="↻" /> CHANGELOG / {formatPublishedDate(entry.publishedAt)}
      </div>
      {entry.version ? <ProjectStatus className="changelog-version mb-3 self-start">{entry.version}</ProjectStatus> : null}
      <h3 className="mb-2 text-2xl">{entry.title}</h3>
      <p className="mb-4 text-muted-foreground">{entry.excerpt}</p>
      {entry.tags.length > 0 ? (
        <TagRow className="mb-3">
          {entry.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
        </TagRow>
      ) : null}
      <CardLink>READ ENTRY →</CardLink>
    </Link>
  )
}
