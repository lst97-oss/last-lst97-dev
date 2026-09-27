import { Link } from '@tanstack/react-router'
import { formatPublishedDate } from '../../../lib/content/date'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '../../../lib/content/project-display'
import type { ChangelogSummary, PostSummary, ProjectSummary } from '../../../server/content/types'
import { PixelIcon } from '../pixel-icon'
import { ContentCover } from './cover'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link className="content-card" to="/blog/$slug" params={{ slug: post.slug }}>
      <div className="card-kicker">
        <PixelIcon glyph="✎" /> NOTE / {formatPublishedDate(post.publishedAt)}
      </div>
      <ContentCover image={post.coverImage} className="content-cover card-cover" />
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
      {post.tags.length > 0 ? (
        <div className="tag-row post-card-tags">
          {post.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
      ) : null}
      <span className="card-link">READ NOTE →</span>
    </Link>
  )
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const lifecycle = getProjectLifecycleLabel(project.projectStatus)
  const timeframe = formatProjectTimeframe(project.projectStatus, project.startDate, project.endDate)

  return (
    <Link className="content-card project-card" to="/projects/$slug" params={{ slug: project.slug }}>
      <div className="card-kicker">
        <PixelIcon glyph="▤" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}
      </div>
      <ContentCover image={project.coverImage} className="content-cover card-cover" />
      {lifecycle || timeframe ? (
        <div className="project-card-meta">
          {lifecycle ? <span className="project-status">{lifecycle}</span> : null}
          {timeframe ? <span>{timeframe}</span> : null}
        </div>
      ) : null}
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <div className="tag-row">
        {project.technologies.slice(0, 4).map((technology) => (
          <span className="tag" key={technology}>{technology}</span>
        ))}
      </div>
      <span className="card-link">OPEN PROJECT →</span>
    </Link>
  )
}

export function ChangelogCard({ entry }: { entry: ChangelogSummary }) {
  return (
    <Link className="content-card changelog-card" to="/changelog/$slug" params={{ slug: entry.slug }}>
      <div className="card-kicker">
        <PixelIcon glyph="↻" /> CHANGELOG / {formatPublishedDate(entry.publishedAt)}
      </div>
      {entry.version ? <span className="project-status changelog-version">{entry.version}</span> : null}
      <h3>{entry.title}</h3>
      <p>{entry.excerpt}</p>
      {entry.tags.length > 0 ? (
        <div className="tag-row post-card-tags">
          {entry.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
      ) : null}
      <span className="card-link">READ ENTRY →</span>
    </Link>
  )
}
