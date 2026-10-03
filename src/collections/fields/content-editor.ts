import { BlocksFeature, CodeBlock, lexicalEditor, TableFeature } from '@payloadcms/richtext-lexical'
import { MarkdownModeFeature } from './markdown-mode-feature'

/**
 * `CodeBlock()`'s default language map is Monaco's, and it ships no `mermaid`
 * entry, so the admin's language select would reject a flowchart fence. Reading
 * the options back off the un-overridden block keeps all 82 Monaco languages
 * instead of replacing them with a one-entry map.
 *
 * Two narrowings are needed: `Block['fields']` is typed as the whole `Field`
 * union, and a select's `label` may be a `LabelFunction`. The CodeBlock Payload
 * ships always has that select first and its options are plain `{ label, value }`
 * pairs; anything else falls back to using the value as its own label.
 */
function monacoLanguages(): [string, string][] {
  const [language] = CodeBlock().fields
  if (language?.type !== 'select') return []

  return language.options.flatMap((option) => {
    if (typeof option === 'string') return [[option, option]]
    const label = typeof option.label === 'string' ? option.label : option.value
    return [[option.value, label]]
  })
}

const MERMAID_LANGUAGES: Record<string, string> = Object.fromEntries([...monacoLanguages(), ['mermaid', 'Mermaid']])

export const contentEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    TableFeature(),
    BlocksFeature({ blocks: [CodeBlock({ languages: MERMAID_LANGUAGES })] }),
    MarkdownModeFeature(),
  ],
})
