import { createServerFeature } from '@payloadcms/richtext-lexical'

export const MarkdownModeFeature = createServerFeature({
  key: 'markdownMode',
  feature: {
    ClientFeature: '@/components/payload/markdown-editor#MarkdownEditorFeatureClient',
  },
})
