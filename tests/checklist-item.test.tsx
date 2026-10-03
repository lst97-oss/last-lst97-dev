import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChecklistItem } from '../src/components/site/content/checklist-item'

describe('rich text checklist item', () => {
  test('uses a native checkbox without assigning checkbox semantics to the list item', () => {
    const markup = renderToStaticMarkup(
      createElement(ChecklistItem, {
        checked: true,
        hasSubLists: false,
        value: 1,
        children: 'Complete the task',
      }),
    )

    expect(markup).toContain('<li')
    expect(markup).not.toContain('role="checkbox"')
    expect(markup).not.toContain('aria-checked=')
    expect(markup).toContain('type="checkbox"')
    expect(markup).toContain('<label')
    expect(markup).toContain('Complete the task')
  })
})
