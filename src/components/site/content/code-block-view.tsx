import type { CSSProperties } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c'
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp'
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp'
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff'
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import graphql from 'react-syntax-highlighter/dist/esm/languages/prism/graphql'
import ini from 'react-syntax-highlighter/dist/esm/languages/prism/ini'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import swift from 'react-syntax-highlighter/dist/esm/languages/prism/swift'
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'

/**
 * `PrismLight` only bundles the grammars registered here, so the highlight
 * weight is proportional to the languages actually used on the site. Every
 * entry maps a Payload Code-block `language` value to a Prism grammar;
 * `HIGHLIGHT_LANGUAGES` below is the authoritative list.
 */
const GRAMMARS = {
  bash,
  c,
  cpp,
  csharp,
  diff,
  docker,
  go,
  graphql,
  ini,
  java,
  javascript,
  json,
  jsx,
  kotlin,
  markdown,
  php,
  python,
  ruby,
  rust,
  sql,
  swift,
  toml,
  tsx,
  typescript,
  yaml,
} as const

for (const [name, grammar] of Object.entries(GRAMMARS)) {
  SyntaxHighlighter.registerLanguage(name, grammar)
}

export type HighlightLanguage = keyof typeof GRAMMARS

/**
 * Prism grammar names that accept an alias in the fenced info string, so
 * ```sh and ```shell both highlight as bash. Payload's Code block stores the
 * raw fence info verbatim, so the CMS happily produces these spellings.
 */
const LANGUAGE_ALIASES: Readonly<Record<string, HighlightLanguage>> = {
  bat: 'ini',
  batch: 'ini',
  cmd: 'ini',
  console: 'bash',
  cs: 'csharp',
  dockerfile: 'docker',
  golang: 'go',
  htm: 'markdown',
  html: 'markdown',
  kt: 'kotlin',
  objc: 'c',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml',
}

/** `undefined` means "no grammar for this language", which renders unstyled. */
function highlightLanguage(language: string | undefined): HighlightLanguage | undefined {
  if (!language) return undefined
  const key = language.trim().toLowerCase()
  if (key in GRAMMARS) return key as HighlightLanguage
  return LANGUAGE_ALIASES[key]
}

const HIGHLIGHT_LABELS: Partial<Record<HighlightLanguage, string>> = {
  bash: 'Shell',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  diff: 'Diff',
  docker: 'Dockerfile',
  go: 'Go',
  graphql: 'GraphQL',
  ini: 'Config',
  java: 'Java',
  javascript: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  kotlin: 'Kotlin',
  markdown: 'Markdown',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  sql: 'SQL',
  swift: 'Swift',
  toml: 'TOML',
  tsx: 'TSX',
  typescript: 'TypeScript',
  yaml: 'YAML',
}

/**
 * Languages that get a readable badge but no Prism grammar. `plaintext` is what
 * the Code block stores for an untagged fence, and printing it verbatim as the
 * badge would put a grammar name in front of a visitor.
 */
const PLAIN_LABELS: Readonly<Record<string, string>> = {
  plaintext: 'Text',
  text: 'Text',
  txt: 'Text',
}

/**
 * The house syntax palette. The values are the site's raw brand colours rather
 * than the tokens because Prism needs literal strings, not `var()` — see
 * `src/styles/globals.css:9-18`. Each token class is shared across grammars, so
 * one palette covers every language.
 */
const pixelCodeTheme: Record<string, CSSProperties> = {
  'code[class*="language-"]': {
    color: 'var(--os-ink-soft)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    whiteSpace: 'pre',
  },
  'pre[class*="language-"]': {
    background: 'transparent',
    color: 'var(--os-ink-soft)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    textShadow: 'none',
    whiteSpace: 'pre',
  },
  comment: { color: '#8b8574', fontStyle: 'italic' },
  punctuation: { color: '#454455' },
  property: { color: '#7952a5' },
  selector: { color: '#7952a5' },
  'attr-name': { color: '#7952a5' },
  string: { color: '#24705c' },
  'attr-value': { color: '#24705c' },
  number: { color: '#bd5348' },
  boolean: { color: '#bd5348', fontWeight: 'bold' },
  null: { color: '#bd5348', fontWeight: 'bold' },
  keyword: { color: '#9a8cff' },
  function: { color: '#24705c' },
  'class-name': { color: '#7952a5' },
  operator: { color: '#8b4d92' },
  tag: { color: '#bd5348' },
  builtin: { color: '#24705c' },
  variable: { color: '#3c3b4a' },
  regex: { color: '#8b4d92' },
  important: { color: '#bd5348', fontWeight: 'bold' },
}

/**
 * The shared code renderer: a syntax-highlighted, line-numbered listing with a
 * language badge in the site's hard-edged chrome.
 *
 * Used by the home page's RAW WAKATIME JSON pane and by every Code block in CMS
 * rich text, so a project write-up and the operator profile are rendered by the
 * same component rather than two look-alikes.
 */
export function CodeBlockView({
  code,
  language,
  label,
}: {
  code: string
  language?: string | undefined
  /** Overrides the badge text; defaults to the language's display name. */
  label?: string | undefined
}) {
  const grammar = highlightLanguage(language)
  const trimmed = language?.trim().toLowerCase()
  const badge =
    label ??
    (grammar ? HIGHLIGHT_LABELS[grammar] : undefined) ??
    (trimmed ? PLAIN_LABELS[trimmed] : undefined) ??
    language ??
    'Text'

  return (
    <div className="code-block">
      <div className="code-block-heading">
        <span className="code-block-language">{badge}</span>
      </div>
      <SyntaxHighlighter
        aria-label={`${badge} code with line numbers`}
        codeTagProps={{ style: { fontFamily: 'inherit' } }}
        customStyle={{
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          margin: 0,
          padding: 0,
          tabSize: 2,
        }}
        language={grammar ?? 'text'}
        lineNumberContainerStyle={{ minWidth: '3.5em' }}
        lineNumberStyle={{
          borderRight: '1px solid #d8d1bd',
          color: '#8b8574',
          display: 'inline-block',
          marginRight: '12px',
          minWidth: '2.5em',
          paddingRight: '12px',
          textAlign: 'right',
          fontStyle: 'normal',
          userSelect: 'none',
        }}
        showLineNumbers
        startingLineNumber={1}
        style={pixelCodeTheme}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
