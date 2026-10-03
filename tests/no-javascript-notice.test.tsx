import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { NoJavaScriptNotice } from '../src/components/site/no-javascript-notice'

describe('NoJavaScriptNotice', () => {
  test('renders a regular server-side blocker that script-blocking extensions cannot remove', () => {
    const markup = renderToStaticMarkup(createElement(NoJavaScriptNotice))
    const openingTagEnd = markup.indexOf('>')
    const closingTagStart = markup.indexOf('</div>')
    const content = markup.slice(openingTagEnd + 1, closingTagStart)

    expect(markup).toContain('<div')
    expect(markup).not.toContain('<noscript')
    expect(markup).toContain('role="alert"')
    expect(content).toContain('LAST//OS // JAVASCRIPT REQUIRED')
    expect(content).toContain('Enable JavaScript in your browser settings, then reload this page to use the website.')
    expect(content).not.toContain('<')
  })

  test('shows the blocker until the early JavaScript marker runs', async () => {
    const css = await Bun.file(new URL('../src/styles/no-javascript-notice.css', import.meta.url)).text()
    const defaultRule = css.match(/\.javascript-disabled-notice\s*\{([^}]*)\}/)?.[1] ?? ''
    const enabledRule = css.match(/\.js-enabled\s+\.javascript-disabled-notice\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(defaultRule).toMatch(/display:\s*block/)
    expect(enabledRule).toMatch(/display:\s*none/)
  })
})
