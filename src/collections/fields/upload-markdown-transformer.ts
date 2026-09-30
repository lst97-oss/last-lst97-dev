import { $createUploadNode, $isUploadNode, UploadNode } from '@payloadcms/richtext-lexical/client'
import type { ElementTransformer } from '@lexical/markdown'
import type { LexicalNode } from 'lexical'

/**
 * Markdown support for image uploads, client side.
 *
 * `@payloadcms/richtext-lexical` ships this transformer on the **server**
 * feature only (`features/upload/server/index.js:74` →
 * `markdownTransformers: [PAYLOAD_UPLOAD]`) and exports it from no package
 * subpath, so the admin cannot reuse it. The upload *client* feature registers
 * no transformers at all. The editor's Markdown view reads
 * `editorConfig.features.markdownTransformers`
 * (`src/components/payload/markdown-editor.tsx:14`), so inside the admin an
 * uploaded image produced no output while the same document converted on the
 * server produced `![alt](url)`.
 *
 * This mirrors the server transformer:
 * - export: a populated image becomes `![alt](url)`, a non-image upload becomes
 *   `[filename](url)`, and a bare id becomes `![relationTo:id]()` so an image is
 *   never silently dropped from the markdown.
 * - import: only the `![relationTo:id]()` placeholder is converted back, and
 *   only when `isImport`. A hand-typed `![alt](https://…)` therefore stays an
 *   ordinary markdown image instead of becoming a broken upload node.
 */
const UPLOAD_PLACEHOLDER_REGEX = /!\[([^\]:]+):([^\]]+)\]\(\)/

function populatedValue(value: unknown): { url: string; alt?: string; mimeType?: string; filename?: string } | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.url !== 'string') return null

  return {
    url: record.url,
    alt: typeof record.alt === 'string' ? record.alt : undefined,
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : undefined,
    filename: typeof record.filename === 'string' ? record.filename : undefined,
  }
}

export const UPLOAD_MARKDOWN_TRANSFORMER: ElementTransformer = {
  type: 'element',
  dependencies: [UploadNode],
  export: (node: LexicalNode) => {
    if (!$isUploadNode(node)) return null

    const data = node.getData()
    const fieldAlt = typeof data.fields.alt === 'string' ? data.fields.alt : undefined
    const populated = populatedValue(data.value)

    if (populated) {
      if (populated.mimeType && !populated.mimeType.startsWith('image')) {
        return `[${populated.filename ?? populated.url}](${populated.url})`
      }
      return `![${fieldAlt ?? populated.alt ?? populated.filename ?? ''}](${populated.url})`
    }

    // A bare id cannot produce a real URL client-side, so emit the placeholder
    // the server transformer's `replace` understands.
    const id = typeof data.value === 'object' && data.value !== null
      ? (data.value as { id?: unknown }).id
      : data.value
    return `![${data.relationTo}:${id}]()`
  },
  regExp: UPLOAD_PLACEHOLDER_REGEX,
  replace: (parentNode, _children, match, isImport) => {
    if (!isImport || !match[1] || !match[2]) return false

    const relationTo = match[1] as 'media'
    const raw = match[2]

    parentNode.replace($createUploadNode({ data: { fields: {}, relationTo, value: Number(raw) } }))
    return true
  },
}
