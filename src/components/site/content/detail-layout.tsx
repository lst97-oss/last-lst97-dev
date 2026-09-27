import { Link } from '@tanstack/react-router'
import type { ComponentProps, ReactNode } from 'react'
import { PixelIcon } from '../pixel-icon'
import { WindowFrame } from '../window-frame'
import { ContentCover } from './cover'

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
    <div className="page-stack narrow-page">
      <WindowFrame title={windowTitle} icon={icon}>
        <Link className="back-link" to={backHref}>{backLabel}</Link>
        <ContentCover image={coverImage} className="content-cover content-detail-cover" />
        <p className="eyebrow"><PixelIcon glyph="●" /> {eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead-copy">{excerpt}</p>
        <div className="tag-row post-tags">{tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="article-body">{children}</div>
      </WindowFrame>
    </div>
  )
}
