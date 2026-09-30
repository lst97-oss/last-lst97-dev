import { BlocksFeature, CodeBlock, lexicalEditor, TableFeature } from '@payloadcms/richtext-lexical'
import { MarkdownModeFeature } from './markdown-mode-feature'

export const contentEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    TableFeature(),
    BlocksFeature({ blocks: [CodeBlock()] }),
    MarkdownModeFeature(),
  ],
})
