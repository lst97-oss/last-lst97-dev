import { defaultJSXConverters, RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import type { JSXConverterArgs, JSXConverters } from '@payloadcms/richtext-lexical/react'
import { useId } from 'react'

import { parseLexicalContent } from '../../../server/content/types'
import { safeAssetHref, safeContentHref } from '../../../lib/content-url'

type RecordValue = Record<string, unknown>
type ConverterNode = { [key: string]: any; type?: string }
type NodesToJSX = JSXConverterArgs<ConverterNode>['nodesToJSX']

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

function renderSafeUpload({ node }: JSXConverterArgs<ConverterNode>) {
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

  const responsiveSources = isRecord(value.sizes)
    ? Object.entries(value.sizes).flatMap(([key, rawSize]) => {
        if (!isRecord(rawSize)) return []
        const sizeURL = safeAssetHref(rawSize.url)
        if (!sizeURL || typeof rawSize.width !== 'number' || typeof rawSize.mimeType !== 'string') return []
        return [
          <source key={key} media={`(max-width: ${rawSize.width}px)`} srcSet={sizeURL} type={rawSize.mimeType} />,
        ]
      })
    : []

  return (
    <picture>
      {responsiveSources}
      <img alt={alt} height={height} src={src} width={width} />
    </picture>
  )
}

function StableChecklistItem({ node, nodesToJSX }: { node: ConverterNode; nodesToJSX: NodesToJSX }) {
  const id = useId()
  const children = Array.isArray(node.children) ? node.children : []
  const hasSubLists = children.some((child: ConverterNode) => child.type === 'list')
  const renderedChildren = nodesToJSX({ nodes: children })
  const checked = node.checked === true

  return (
    <li
      aria-checked={checked ? 'true' : 'false'}
      className={`list-item-checkbox${checked ? ' list-item-checkbox-checked' : ' list-item-checkbox-unchecked'}${hasSubLists ? ' nestedListItem' : ''}`}
      role="checkbox"
      style={{ listStyleType: 'none' }}
      tabIndex={-1}
      value={node.value}
    >
      {hasSubLists ? renderedChildren : <>
        <input checked={checked} id={id} readOnly type="checkbox" />
        <label htmlFor={id}>{renderedChildren}</label>
        <br />
      </>}
    </li>
  )
}

function renderListItem(args: JSXConverterArgs<ConverterNode>) {
  const { node, nodesToJSX, parent } = args
  const children = Array.isArray(node.children) ? node.children : []
  const hasSubLists = children.some((child: ConverterNode) => child.type === 'list')

  if ((parent as unknown as RecordValue).listType === 'check') {
    return <StableChecklistItem key={args.childIndex} node={node} nodesToJSX={nodesToJSX} />
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

const converters: JSXConverters = {
  ...defaultJSXConverters,
  autolink: renderSafeLink,
  link: renderSafeLink,
  listitem: renderListItem,
  relationship: renderRelationship,
  upload: renderSafeUpload,
}

export function RichText({ value }: { value: unknown }) {
  const editorState = parseLexicalContent(value)
  if (!editorState || editorState.root.children.length === 0) {
    return <p className="muted-copy">This entry is still being written.</p>
  }

  return <PayloadRichText className="rich-text" data={editorState} converters={converters} />
}
