import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { ContentCover } from '@/components/site/content/cover'
import { PlaceholderArt } from '@/components/site/content/cover-placeholder'
import { CardLink, ProjectStatus, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { CHANGELOG_CHANGE_TYPE_LABELS } from '@/lib/content/changelog-display'
import { contentCardDate, formatPublishedDate } from '@/lib/content/date'
import { formatProjectTimeframe, getProjectLifecycleLabel } from '@/lib/content/project-display'
import type { ChangelogSummary, PostSummary, ProjectSummary } from '@/server/content/types'

const cardClass =
  'content-card flex min-h-50 flex-col items-start border-3 border-border bg-card p-5 shadow-none transition-[translate,background-color] duration-100 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-warning-muted'

const kickerClass = 'card-kicker text-xs font-black tracking-widest text-accent uppercase'

const COVER_CLASS = 'content-cover card-cover'

// Cards sit at a fixed column width, so an unbounded summary makes one card
// tower over its neighbours and defeats the masonry packing. Three lines is
// the house clamp (see components/ui/item.tsx).
const summaryClass = 'mb-4 line-clamp-3 text-muted-foreground'

const metaClass = 'mt-3 text-xs font-black tracking-wider text-muted-foreground uppercase'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link className={cardClass} to="/blog/$slug" params={{ slug: post.slug }}>
      <div className={kickerClass}>
        <PixelIcon glyph="✎" /> NOTE / {formatPublishedDate(post.publishedAt)}
      </div>
      <ContentCover className={COVER_CLASS} fallback={<PlaceholderArt label={post.title} seed={post.slug} />} image={post.coverImage} />
      <h3 className="mb-2 text-2xl">{post.title}</h3>
      <p className={summaryClass}>{post.excerpt}</p>
      {post.tags.length > 0 ? (
        <TagRow className="mb-3">
          {post.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
        </TagRow>
      ) : null}
      {post.topics && post.topics.length > 0 ? <TagRow className="mb-3">{post.topics.slice(0, 3).map((topic) => <span key={topic.slug}><Tag>{topic.title}</Tag></span>)}</TagRow> : null}
      <CardLink>READ NOTE →</CardLink>
    </Link>
  )
}

/**
 * The home page's `featured-project.app` window holds one card, not a grid
 * column, so the card grid's `33vw` descriptor and full-bleed cover are both
 * wrong there: the cover would span the whole window and the browser would be
 * told to expect a third of the viewport. `featured` caps the cover and
 * declares the real width instead.
 */
export function ProjectCard({
  project,
  featured = false,
}: {
  project: ProjectSummary
  featured?: boolean
}) {
  const lifecycle = getProjectLifecycleLabel(project.projectStatus)
  const timeframe = formatProjectTimeframe(project.projectStatus, project.startDate, project.endDate)
  const updated = contentCardDate(null, project.updatedAt)

  return (
    <Link className={cn(cardClass, 'project-card', featured && 'project-card--featured')} to="/projects/$slug" params={{ slug: project.slug }}>
      <div className={kickerClass}>
        <PixelIcon glyph="▤" /> PROJECT / {project.featured ? 'FEATURED' : 'ARCHIVE'}
      </div>
      <ContentCover
        className={featured ? 'content-cover project-card-cover' : COVER_CLASS}
        fallback={<PlaceholderArt label={project.title} seed={project.slug} />}
        image={project.coverImage}
        // The window is a 3/5 column of a max-w-6xl page with its own padding,
        // so the cover tops out near 480px rather than tracking the viewport.
        sizes={featured ? '(min-width: 1024px) 480px, 100vw' : undefined}
      />
      {lifecycle || timeframe ? (
        <div className="project-card-meta my-3 flex flex-wrap items-center gap-2 text-xs font-black tracking-wide text-muted-foreground">
          {lifecycle ? <ProjectStatus>{lifecycle}</ProjectStatus> : null}
          {timeframe ? <span>{timeframe}</span> : null}
        </div>
      ) : null}
      {updated ? <span className={metaClass}>UPDATED / {updated}</span> : null}
      <h3 className="mb-2 text-2xl">{project.title}</h3>
      <p className={summaryClass}>{project.summary}</p>
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
      <ContentCover className={COVER_CLASS} fallback={<PlaceholderArt label={entry.title} seed={entry.slug} />} image={entry.coverImage} />
      {entry.version ? <ProjectStatus className="changelog-version mb-3 self-start">{entry.version}</ProjectStatus> : null}
      {entry.changeTypes.length > 0 ? (
        <TagRow className="mb-3">
          {entry.changeTypes.map((type) => <ProjectStatus key={type}>{CHANGELOG_CHANGE_TYPE_LABELS[type]}</ProjectStatus>)}
        </TagRow>
      ) : null}
      <h3 className="mb-2 text-2xl">{entry.title}</h3>
      <p className={summaryClass}>{entry.excerpt}</p>
      {entry.tags.length > 0 ? (
        <TagRow className="mb-3">
          {entry.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
        </TagRow>
      ) : null}
      <CardLink>READ ENTRY →</CardLink>
    </Link>
  )
}
