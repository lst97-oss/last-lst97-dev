import { describe, expect, test } from 'bun:test'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { $createUploadNode, UploadNode } from '@payloadcms/richtext-lexical/client'
import { $getRoot, createEditor } from 'lexical'

import { UPLOAD_MARKDOWN_TRANSFORMER } from '../src/collections/fields/upload-markdown-transformer'

const IMAGE_URL = 'https://cdn.example.com/shot.png'

function buildEditor() {
  return createEditor({
    nodes: [UploadNode],
    onError: (error: unknown) => {
      throw error
    },
  })
}

/** Renders one populated image node and returns its markdown. */
function exportPopulatedImage() {
  const editor = buildEditor()
  editor.update(
    () => {
      $getRoot().append(
        $createUploadNode({
          data: {
            fields: { alt: 'In-article first image' },
            relationTo: 'media',
            value: {
              id: 7,
              url: IMAGE_URL,
              alt: 'In-article first image',
              mimeType: 'image/png',
              filename: 'shot.png',
            } as never,
          },
        }),
      )
    },
    { discrete: true },
  )
  return editor.getEditorState().read(() => $convertToMarkdownString([UPLOAD_MARKDOWN_TRANSFORMER]))
}

function importMarkdown(markdown: string) {
  const editor = buildEditor()
  editor.update(
    () => {
      $getRoot().clear()
      $convertFromMarkdownString(markdown, [UPLOAD_MARKDOWN_TRANSFORMER])
    },
    { discrete: true },
  )
  return editor.getEditorState().toJSON().root.children as Array<Record<string, unknown>>
}

describe('upload markdown transformer', () => {
  test('exports a populated image as markdown with its real url and alt text', () => {
    const markdown = exportPopulatedImage()

    expect(markdown).toBe(`![In-article first image](${IMAGE_URL})`)
  })

  test('exports a bare id as the placeholder form instead of dropping the image', () => {
    const editor = buildEditor()
    editor.update(
      () => {
        $getRoot().append($createUploadNode({ data: { fields: {}, relationTo: 'media', value: 7 as never } }))
      },
      { discrete: true },
    )

    expect(editor.getEditorState().read(() => $convertToMarkdownString([UPLOAD_MARKDOWN_TRANSFORMER]))).toBe(
      '![media:7]()',
    )
  })

  test('re-imports the placeholder as an upload node so the round trip is lossless', () => {
    const children = importMarkdown('![media:7]()')

    expect(children).toHaveLength(1)
    expect(children[0]?.type).toBe('upload')
    expect(children[0]?.relationTo).toBe('media')
    expect(children[0]?.value).toBe(7)
  })

  test('leaves a hand-typed markdown image alone rather than creating a broken upload', () => {
    const children = importMarkdown(`![typed](${IMAGE_URL})`)

    expect(children).toHaveLength(1)
    expect(children[0]?.type).toBe('paragraph')
  })
})
