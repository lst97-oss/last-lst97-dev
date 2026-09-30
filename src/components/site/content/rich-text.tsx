import type { JSXConverterArgs, JSXConverters } from '@payloadcms/richtext-lexical/react'
import { defaultJSXConverters, RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import { ChecklistItem } from '@/components/site/content/checklist-item'
import { type MediaViewerItem, ProseImage, uploadToMediaItem } from '@/components/site/share/media'
import { safeAssetHref, safeContentHref } from '@/lib/content/url'
import { parseLexicalContent } from '@/server/content/types'

type RecordValue = Record<string, unknown>
type ConverterNode = { [key: string]: any; type?: string }

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function internalHref(fields: RecordValue): string | null {
  const doc = fields.doc
  if (!isRecord(doc) || !isRecord(doc.value)) return null

  const slug = doc.value.slug
  if (typeof slug !== 'string' || !slug.trim()) return null
  const encodedSlug = encodeURIComponent(slug)
  if (doc.relationTo === 'posts') return `/blog/${encodedSlug}`
  if (doc.relationTo === 'projects') return `/projects/${encodedSlug}`
  return null
}

function renderSafeLink({ node, nodesToJSX }: JSXConverterArgs<ConverterNode>) {
  const fields = isRecord(node.fields) ? node.fields : {}
  const children = nodesToJSX({ nodes: Array.isArray(node.children) ? node.children : [] })
  const href = fields.linkType === 'internal' ? internalHref(fields) : safeContentHref(fields.url)

  if (!href) return <>{children}</>

  const newTab = fields.newTab === true
  return (
    <a href={href} rel={newTab ? 'noopener noreferrer' : undefined} target={newTab ? '_blank' : undefined}>
      {children}
    </a>
  )
}

function renderRelationship({ node }: JSXConverterArgs<ConverterNode>) {
  const value = node.value
  if (!isRecord(value) || typeof value.slug !== 'string' || !value.slug.trim()) return null

  const href = node.relationTo === 'posts'
    ? `/blog/${encodeURIComponent(value.slug)}`
    : node.relationTo === 'projects'
      ? `/projects/${encodeURIComponent(value.slug)}`
      : null
  if (!href) return null

  const collectionName = node.relationTo === 'posts' ? 'NOTE' : 'PROJECT'
  const title = typeof value.title === 'string' ? value.title : value.slug
  const description = typeof value.excerpt === 'string'
    ? value.excerpt
    : typeof value.summary === 'string'
      ? value.summary
      : null

  return (
    <a className="rich-relationship" href={href}>
      <span className="rich-relationship-kicker">RELATED {collectionName}</span>
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
    </a>
  )
}

/**
 * Every image in one article, in document order, so an in-prose image opens a
 * viewer that steps through the rest of the article's images rather than a
 * viewer holding a single image. Collected before render because the Lexical
 * converters are pure functions that cannot hold shared state.
 */
function collectProseImages(editorState: unknown): MediaViewerItem[] {
  const items: MediaViewerItem[] = []

  const visit = (node: unknown) => {
    if (!isRecord(node)) return
    if (node.type === 'upload') {
      const value = node.value
      if (isRecord(value) && typeof value.mimeType === 'string' && value.mimeType.startsWith('image/')) {
        const item = uploadToMediaItem(value)
        if (item) items.push(item)
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(visit)
  }

  if (isRecord(editorState) && isRecord(editorState.root)) visit(editorState.root)
  return items
}

/**
 * `JSXConverters` only receives the node, so the article's image list and a
 * document-order cursor are captured in this closure instead of passed in.
 * The cursor is what keeps the viewer's list aligned with the rendered nodes:
 * the converter walks the document in the same order the pre-pass did, so the
 * Nth image node rendered is the Nth entry in `proseImages`.
 */
function proseImageConverter(proseImages: MediaViewerItem[]) {
  let cursor = 0

  return function renderProseImage({ node }: JSXConverterArgs<ConverterNode>) {
    const value = node.value
    if (!isRecord(value)) return null

    const src = safeAssetHref(value.url)
    if (!src) return null

    const fields = isRecord(node.fields) ? node.fields : {}
    const alt = typeof fields.alt === 'string'
      ? fields.alt
      : typeof value.alt === 'string'
        ? value.alt
        : ''
    const width = typeof value.width === 'number' ? value.width : undefined
    const height = typeof value.height === 'number' ? value.height : undefined

    if (typeof value.mimeType !== 'string' || !value.mimeType.startsWith('image/')) {
      const filename = typeof value.filename === 'string' ? value.filename : 'Open attached file'
      return <a href={src} rel="noopener noreferrer" target="_blank">{filename}</a>
    }

    // Reuse the one srcset builder so prose images get the same aspect-checked
    // width-descriptor candidates as covers and the gallery. The previous
    // `<picture>`/`<source media="(max-width: Npx)">` list was art direction
    // driven by IMAGE width, which is backwards: `media` matches the VIEWPORT,
    // so a 1600px `hero` was offered to every viewport up to 1600px wide.
    const srcSet = uploadToMediaItem(value)?.srcSet

    // A node the pre-pass skipped (unsafe URL, or a non-image upload) renders
    // as a plain image and must NOT consume a slot, or every later image
    // would open the wrong entry in the viewer.
    if (!proseImages[cursor]) {
      return <img alt={alt} decoding="async" height={height} loading="lazy" sizes="(min-width: 1024px) 768px, 100vw" src={src} srcSet={srcSet} width={width} />
    }

    const index = cursor
    cursor += 1

    return <ProseImage alt={alt} index={index} items={proseImages} srcSet={srcSet} />
  }
}

function renderListItem(args: JSXConverterArgs<ConverterNode>) {
  const { node, nodesToJSX, parent } = args
  const children = Array.isArray(node.children) ? node.children : []
  const hasSubLists = children.some((child: ConverterNode) => child.type === 'list')

  if ((parent as unknown as RecordValue).listType === 'check') {
    return (
      <ChecklistItem checked={node.checked === true} hasSubLists={hasSubLists} key={args.childIndex} value={node.value}>
        {nodesToJSX({ nodes: children })}
      </ChecklistItem>
    )
  }

  return (
    <li
      className={hasSubLists ? 'nestedListItem' : ''}
      style={hasSubLists ? { listStyleType: 'none' } : undefined}
      value={node.value}
    >
      {nodesToJSX({ nodes: children })}
    </li>
  )
}

function buildConverters(proseImages: MediaViewerItem[]): JSXConverters {
  return {
    ...defaultJSXConverters,
    autolink: renderSafeLink,
    link: renderSafeLink,
    listitem: renderListItem,
    relationship: renderRelationship,
    upload: proseImageConverter(proseImages),
    table: ({ node, nodesToJSX }: JSXConverterArgs<ConverterNode>) => <table><tbody>{nodesToJSX({ nodes: Array.isArray(node.children) ? node.children : [] })}</tbody></table>,
    tablerow: ({ node, nodesToJSX }: JSXConverterArgs<ConverterNode>) => <tr>{nodesToJSX({ nodes: Array.isArray(node.children) ? node.children : [] })}</tr>,
    tablecell: ({ node, nodesToJSX }: JSXConverterArgs<ConverterNode>) => {
      const TagName = node.headerState ? 'th' : 'td'
      return <TagName colSpan={typeof node.colSpan === 'number' ? node.colSpan : undefined}>{nodesToJSX({ nodes: Array.isArray(node.children) ? node.children : [] })}</TagName>
    },
    blocks: { Code: ({ node }: JSXConverterArgs<ConverterNode>) => {
      const fields = isRecord(node.fields) ? node.fields : {}
      const code = typeof fields.code === 'string' ? fields.code : ''
      const language = typeof fields.language === 'string' ? fields.language : 'text'
      return <pre><code data-language={language}>{code}</code></pre>
    } },
  }
}

export function RichText({ value }: { value: unknown }) {
  const editorState = parseLexicalContent(value)
  if (!editorState || editorState.root.children.length === 0) {
    return <p className="muted-copy">This entry is still being written.</p>
  }

  // A fresh converter set per render: the upload converter holds a
  // document-order cursor, so a shared module-level set would carry stale
  // state between articles and between server and client renders.
  return (
    <PayloadRichText
      className="rich-text"
      converters={buildConverters(collectProseImages(editorState))}
      data={editorState}
    />
  )
}
