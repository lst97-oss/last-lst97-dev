import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ContentUnavailablePanel } from '../src/components/site/content/unavailable'

describe('content unavailable state', () => {
  test('offers a retry without exposing backend error details', () => {
    const markup = renderToStaticMarkup(createElement(ContentUnavailablePanel, {
      message: 'The content service is temporarily unavailable.',
      onRetry: () => {},
    }))

    expect(markup).toContain('role="alert"')
    expect(markup).toContain('The content service is temporarily unavailable.')
    expect(markup).toContain('RETRY CONNECTION')
    expect(markup).not.toContain('database unavailable')
  })
})
