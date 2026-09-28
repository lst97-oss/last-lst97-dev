import { Link } from '@tanstack/react-router'
import type { ComponentProps, ReactNode } from 'react'
import { ContentCover } from '@/components/site/content/cover'
import { Eyebrow, PageStack, Tag, TagRow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

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
  children: ReactNode
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
  children,
}: ContentDetailLayoutProps) {
  return (
    <PageStack className="max-w-4xl">
      <WindowFrame title={windowTitle} icon={icon}>
        <Link className="back-link mb-7 inline-block text-xs font-black tracking-wider text-accent" to={backHref}>{backLabel}</Link>
        <ContentCover image={coverImage} className="content-cover content-detail-cover" />
        <Eyebrow><PixelIcon glyph="●" /> {eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p className="lead-copy">{excerpt}</p>
        <TagRow className="post-tags my-6">{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</TagRow>
        <div className="article-body">{children}</div>
      </WindowFrame>
    </PageStack>
  )
}
