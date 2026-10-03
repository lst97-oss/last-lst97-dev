import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const module = await import('../src/components/site/json-code-view').catch(() => null)

test('renders syntax-highlighted JSON with line numbers', () => {
  expect(module).not.toBeNull()
  if (!module) return

  const markup = renderToStaticMarkup(createElement(module.JsonCodeView, { code: '{\n  "name": "Nelson"\n}' }))

  expect(markup).toContain('color:#7952a5')
  expect(markup).toContain('color:#24705c')
  expect(markup).toContain('linenumber')
  expect(markup).toContain('>1</span>')
  expect(markup).toContain('>2</span>')
  expect(markup).toContain('>3</span>')
})
