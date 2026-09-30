import { Link } from '@tanstack/react-router'
import { Children, type ComponentProps, type ReactNode } from 'react'
import { ContentCover } from '@/components/site/content/cover'
import { Eyebrow, PageStack, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { MediaTrigger, toMediaItem } from '@/components/site/share/media'
import { WindowFrame } from '@/components/site/window-frame'
import { contentCardDate } from '@/lib/content/date'
import type { TopicSummary } from '@/server/content/types'

interface ContentDetailLayoutProps {
  windowTitle: string
  icon: string
  backHref: '/blog' | '/changelog'
  backLabel: string
  eyebrow: string
  coverImage: ComponentProps<typeof ContentCover>['image']
  title: string
  excerpt: string
  tags: string[]
  topics?: TopicSummary[]
  badges?: string[]
  readingTime?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  children: ReactNode
}

/**
 * The byline strip. Extracted from the layout so each optional field is a
 * single conditional at the call site instead of five inside one function.
 */
function DetailMeta({
  published,
  created,
  updated,
  readingTime,
}: {
  published: string | null
  created: string | null
  updated: string | null
  readingTime: string | null
}) {
  if (!published && !created && !updated && !readingTime) return null

  return (
    <div className="detail-meta mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-black tracking-widest text-muted-foreground uppercase">
      {published ? <span>PUBLISHED / {published}</span> : null}
      {created ? <span>CREATED / {created}</span> : null}
      {updated ? <span>UPDATED / {updated}</span> : null}
      {readingTime ? <span>{readingTime}</span> : null}
    </div>
  )
}

/**
 * A label row, or nothing when the document carries no labels. Both the tag
 * rows and the topic row are this: an empty row would otherwise reserve a
 * margin above and below the article body.
 */
function DetailLabelRow({ className, children }: { className: string; children: ReactNode }) {
  // `toArray` drops the nulls an empty `.map` leaves behind, so a row with no
  // labels disappears instead of reserving its margins around nothing.
  if (Children.toArray(children).length === 0) return null

  return <TagRow className={className}>{children}</TagRow>
}

export function ContentDetailLayout({
  windowTitle,
  icon,
  backHref,
  backLabel,
  eyebrow,
  coverImage,
  title,
  excerpt,
  tags,
  topics = [],
  badges = [],
  children,
  readingTime = null,
  publishedAt = null,
  updatedAt = null,
}: ContentDetailLayoutProps) {
  const coverItem = toMediaItem(coverImage, { altFallback: title })

  const published = contentCardDate(publishedAt)
  const updated = publishedAt && updatedAt && updatedAt !== publishedAt ? contentCardDate(updatedAt) : null
  const created = publishedAt ? null : contentCardDate(updatedAt)

  return (
    <PageStack className="max-w-4xl">
      <WindowFrame title={windowTitle} icon={icon} scrollable>
        <Link className="back-link mb-7 inline-block text-xs font-black tracking-wider text-accent" to={backHref}>{backLabel}</Link>
        <MediaTrigger item={coverItem} label={`View full size image: ${title}`}>
          <ContentCover image={coverImage} className="content-cover content-detail-cover" priority />
        </MediaTrigger>
        <Eyebrow><PixelIcon glyph="●" /> {eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p className="lead-copy">{excerpt}</p>
        <DetailMeta created={created} published={published} readingTime={readingTime} updated={updated} />
        <DetailLabelRow className="post-tags my-6">{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</DetailLabelRow>
        <DetailLabelRow className="post-tags -mt-4 mb-6">{badges.map((badge) => <Tag key={badge}>{badge}</Tag>)}</DetailLabelRow>
        <DetailLabelRow className="post-tags -mt-4 mb-6">{topics.map((topic) => <Link key={topic.slug} to="/blog/topics/$slug" params={{ slug: topic.slug }}><Tag>{topic.title}</Tag></Link>)}</DetailLabelRow>
        <div className="article-body">{children}</div>
      </WindowFrame>
    </PageStack>
  )
}
