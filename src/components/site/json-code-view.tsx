import type { CSSProperties } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'

SyntaxHighlighter.registerLanguage('json', json)

const pixelJsonTheme: Record<string, CSSProperties> = {
  'code[class*="language-"]': {
    color: '#3c3b4a',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    whiteSpace: 'pre',
  },
  'pre[class*="language-"]': {
    background: 'transparent',
    color: '#3c3b4a',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    textShadow: 'none',
    whiteSpace: 'pre',
  },
  comment: { color: '#817c6e', fontStyle: 'italic' },
  punctuation: { color: '#454455' },
  property: { color: '#7952a5' },
  string: { color: '#24705c' },
  number: { color: '#bd5348' },
  boolean: { color: '#bd5348', fontWeight: 'bold' },
  null: { color: '#bd5348', fontWeight: 'bold' },
  operator: { color: '#8b4d92' },
}

export function JsonCodeView({ code }: { code: string }) {
  return (
    <SyntaxHighlighter
      aria-label="Formatted JSON with line numbers"
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
      language="json"
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
      style={pixelJsonTheme}
    >
      {code}
    </SyntaxHighlighter>
  )
}
