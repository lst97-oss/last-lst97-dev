import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Children, type ComponentProps, type ReactNode } from 'react'
import { ContentCover } from '@/components/site/content/cover'
import { DetailMeta } from '@/components/site/content/detail-meta'
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
  /**
   * Drop the 700px prose reading measure so the body spans the window, the way
   * the project detail page does. Both detail pages carry Mermaid diagrams and
   * wide code blocks, which the measure crops into a horizontally scrollable
   * sliver. `.article-body--wide` is the existing project-page treatment.
   */
  wide?: boolean
  children: ReactNode
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
  wide = false,
}: ContentDetailLayoutProps) {
  const coverItem = toMediaItem(coverImage, { altFallback: title })

  const published = contentCardDate(publishedAt)
  const updated = publishedAt && updatedAt && updatedAt !== publishedAt ? contentCardDate(updatedAt) : null
  const created = publishedAt ? null : contentCardDate(updatedAt)

  return (
    // No width override: the list pages use PageStack's default `max-w-6xl`, and
    // a narrower detail column made the window jump inward on every navigation
    // between a list and one of its entries.
    <PageStack>
      <WindowFrame title={windowTitle} icon={icon} scrollable>
        <Link className="back-link mb-7 inline-block text-xs font-black tracking-wider text-accent" to={backHref}>
          {backLabel}
        </Link>
        <MediaTrigger item={coverItem} label={`View full size image: ${title}`}>
          <ContentCover image={coverImage} className="content-cover content-detail-cover" priority />
        </MediaTrigger>
        <Eyebrow>
          <PixelIcon glyph="●" /> {eyebrow}
        </Eyebrow>
        <h1>{title}</h1>
        <p className="lead-copy">{excerpt}</p>
        <DetailMeta created={created} published={published} readingTime={readingTime} updated={updated} />
        <DetailLabelRow className="post-tags my-6">
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </DetailLabelRow>
        <DetailLabelRow className="post-tags -mt-4 mb-6">
          {badges.map((badge) => (
            <Tag key={badge}>{badge}</Tag>
          ))}
        </DetailLabelRow>
        <DetailLabelRow className="post-tags -mt-4 mb-6">
          {topics.map((topic) => (
            <Link key={topic.slug} to="/blog/topics/$slug" params={{ slug: topic.slug }}>
              <Tag>{topic.title}</Tag>
            </Link>
          ))}
        </DetailLabelRow>
        <div className={cn('article-body', wide && 'article-body--wide')}>{children}</div>
      </WindowFrame>
    </PageStack>
  )
}
