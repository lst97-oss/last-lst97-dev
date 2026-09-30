import { safeAssetHref, safeContentHref } from '../../lib/content-url'
import type { LexicalContent } from './types'
import { parseLexicalContent } from './types'

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function publicRelatedRecord(relationTo: unknown, value: unknown, now: Date): RecordValue | null {
  if ((relationTo !== 'posts' && relationTo !== 'projects') || !isRecord(value)) return null
  if (value.status !== 'published' || typeof value.publishedAt !== 'string') return null

  const publishedAt = Date.parse(value.publishedAt)
  if (!Number.isFinite(publishedAt) || publishedAt > now.getTime()) return null
  if (typeof value.slug !== 'string' || !value.slug.trim()) return null

  const related: RecordValue = { slug: value.slug }
  if (typeof value.id === 'string' || typeof value.id === 'number') related.id = value.id
  if (typeof value.title === 'string') related.title = value.title
  if (relationTo === 'posts' && typeof value.excerpt === 'string') related.excerpt = value.excerpt
  if (relationTo === 'projects' && typeof value.summary === 'string') related.summary = value.summary
  return related
}

function sanitizeUpload(value: unknown): RecordValue | null {
  if (!isRecord(value)) return null
  const url = safeAssetHref(value.url)
  if (!url || typeof value.mimeType !== 'string' || typeof value.filename !== 'string') return null

  const upload: RecordValue = {
    url,
    mimeType: value.mimeType,
    filename: value.filename,
  }
  for (const key of ['id', 'alt', 'width', 'height'] as const) {
    const item = value[key]
    if (typeof item === 'string' || typeof item === 'number') upload[key] = item
  }

  if (isRecord(value.sizes)) {
    const sizes: RecordValue = {}
    for (const [key, rawSize] of Object.entries(value.sizes)) {
      if (!isRecord(rawSize)) continue
      const sizeURL = safeAssetHref(rawSize.url)
      if (!sizeURL || typeof rawSize.mimeType !== 'string' || typeof rawSize.width !== 'number') continue
      // `height` is kept so a client can prove a candidate matches the
      // original's aspect ratio before offering it in a `w`-descriptor
      // srcset. Payload's imageSizes are fixed-aspect crops, so a candidate
      // with the wrong ratio is not a valid substitute.
      sizes[key] = {
        url: sizeURL,
        mimeType: rawSize.mimeType,
        width: rawSize.width,
        height: typeof rawSize.height === 'number' ? rawSize.height : null,
      }
    }
    if (Object.keys(sizes).length > 0) upload.sizes = sizes
  }

  return upload
}

function sanitizeNode(node: RecordValue, now: Date): RecordValue | null {
  const sanitized: RecordValue = { type: node.type }
  for (const key of [
    'version',
    'direction',
    'format',
    'indent',
    'tag',
    'listType',
    'start',
    'value',
    'checked',
    'detail',
    'mode',
    'style',
    'text',
    'headerState',
    'colSpan',
    'rowSpan',
  ]) {
    if (key in node) sanitized[key] = node[key]
  }

  if (Array.isArray(node.children)) {
    sanitized.children = node.children.flatMap((child) => {
      if (!isRecord(child)) return []
      const projected = sanitizeNode(child, now)
      return projected ? [projected] : []
    })
  }

  if (node.type === 'block') {
    if (!isRecord(node.fields) || node.fields.blockType !== 'Code' || typeof node.fields.code !== 'string') return null
    sanitized.fields = {
      blockType: 'Code',
      code: node.fields.code,
      ...(typeof node.fields.language === 'string' ? { language: node.fields.language } : {}),
    }
    return sanitized
  }

  if (node.type === 'relationship') {
    const related = publicRelatedRecord(node.relationTo, node.value, now)
    if (!related) return null
    sanitized.relationTo = node.relationTo
    sanitized.value = related
    return sanitized
  }

  if (node.type === 'link' || node.type === 'autolink') {
    const fields = isRecord(node.fields) ? node.fields : {}
    const linkType = fields.linkType === 'internal' ? 'internal' : 'custom'
    const projectedFields: RecordValue = { linkType, newTab: fields.newTab === true }
    if (linkType === 'internal') {
      const doc = isRecord(fields.doc) ? fields.doc : null
      const related = doc ? publicRelatedRecord(doc.relationTo, doc.value, now) : null
      projectedFields.doc = related && doc ? { relationTo: doc.relationTo, value: related } : null
    } else {
      const href = safeContentHref(fields.url)
      if (href) projectedFields.url = href
    }
    sanitized.fields = projectedFields
    return sanitized
  }

  if (node.type === 'upload') {
    const upload = sanitizeUpload(node.value)
    if (!upload) return null
    const fields = isRecord(node.fields) ? node.fields : {}
    sanitized.relationTo = node.relationTo === 'media' ? 'media' : node.relationTo
    sanitized.id = typeof node.id === 'string' ? node.id : undefined
    sanitized.fields = typeof fields.alt === 'string' ? { alt: fields.alt } : {}
    sanitized.value = upload
  }

  return sanitized
}

export function projectPublicLexicalContent(value: unknown, now = new Date()): LexicalContent | null {
  const parsed = parseLexicalContent(value)
  if (!parsed) return null

  const root = parsed.root as unknown as RecordValue
  const children = root.children as RecordValue[]
  return {
    ...parsed,
    root: {
      ...parsed.root,
      children: children.flatMap((node) => {
        const projected = sanitizeNode(node, now)
        return projected ? [projected] : []
      }),
    },
  } as LexicalContent
}
