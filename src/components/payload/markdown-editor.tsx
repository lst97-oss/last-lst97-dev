'use client'

import { createClientFeature, useEditorConfigContext } from '@payloadcms/richtext-lexical/client'
import { $getRoot } from '@payloadcms/richtext-lexical/lexical'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@payloadcms/richtext-lexical/lexical/markdown'
import { Button } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { UPLOAD_MARKDOWN_TRANSFORMER } from '@/collections/fields/upload-markdown-transformer'
import './markdown-editor.css'

function MarkdownEditorModePlugin() {
  const { editor, editorConfig, editorContainerRef } = useEditorConfigContext()
  const [mode, setMode] = useState<'formatted' | 'markdown'>('formatted')
  const [markdown, setMarkdown] = useState('')
  const markdownTransformers = editorConfig.features.markdownTransformers

  useEffect(() => {
    const editorContainer = editorContainerRef.current
    if (!editorContainer) return

    const previousDisplay = editorContainer.style.display
    editorContainer.classList.add('payload-markdown-editor__formatted-container')
    editorContainer.style.display = mode === 'markdown' ? 'none' : previousDisplay

    return () => {
      editorContainer.style.display = previousDisplay
      editorContainer.classList.remove('payload-markdown-editor__formatted-container')
    }
  }, [editorContainerRef, mode])

  function showMarkdown() {
    const currentMarkdown = editor.getEditorState().read(() => $convertToMarkdownString(markdownTransformers))
    setMarkdown(currentMarkdown)
    setMode('markdown')
  }

  function updateMarkdown(value: string) {
    setMarkdown(value)
    editor.update(() => {
      $getRoot().clear()
      $convertFromMarkdownString(value, markdownTransformers)
    })
  }

  return (
    <div className="payload-markdown-editor">
      <div aria-label="Content editor mode" className="payload-markdown-editor__modes" role="group">
        <Button
          aria-pressed={mode === 'formatted'}
          buttonStyle="secondary"
          onClick={() => setMode('formatted')}
          size="medium"
          type="button"
        >
          Formatted
        </Button>
        <Button
          aria-pressed={mode === 'markdown'}
          buttonStyle="secondary"
          onClick={showMarkdown}
          size="medium"
          type="button"
        >
          Markdown
        </Button>
      </div>
      {mode === 'markdown' && (
        <textarea
          aria-label="Markdown source"
          className="payload-markdown-editor__textarea"
          onChange={(event) => updateMarkdown(event.currentTarget.value)}
          spellCheck={false}
          value={markdown}
        />
      )}
    </div>
  )
}

export const MarkdownEditorFeatureClient = createClientFeature(() => ({
  // The editor's Markdown view reads `features.markdownTransformers`. Payload
  // registers the upload transformer on its server feature only and exports it
  // from no package subpath, so without this an uploaded image renders as
  // nothing in the Markdown view while the server converts it to `![alt](url)`.
  markdownTransformers: [UPLOAD_MARKDOWN_TRANSFORMER],
  plugins: [{ Component: MarkdownEditorModePlugin, position: 'aboveContainer' }],
}))
