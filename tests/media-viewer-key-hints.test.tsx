import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { MediaViewerKeyHint } from '../src/components/site/share/media/media-viewer-key-hint'

// These assert the extracted `MediaViewerKeyHint` rather than `MediaViewer`
// itself. The viewer only ever renders inside a Base UI Dialog portal, whose
// content is absent from server markup, so a hint asserted from the viewer's
// output could not be tested at all — and mounting it instead is not an option
// either, because Base UI captures `window`/`document` when its modules are
// first evaluated, so any test process that statically imports the viewer pins
// them to Bun's globals and the portal silently never mounts.

describe('media viewer key hints', () => {
  test('names the arrow and Escape bindings when there is more than one image', () => {
    // Arrows are bound on DialogContent and Escape comes from the dialog
    // primitive; neither is disclosed anywhere else in the viewer.
    const markup = renderToStaticMarkup(createElement(MediaViewerKeyHint, { hasMultiple: true }))

    expect(markup).toContain('media-viewer-key-hint')
    expect(markup).toContain('←')
    expect(markup).toContain('→')
    expect(markup).toContain('NAVIGATE')
    expect(markup).toContain('ESC')
    expect(markup).toContain('CLOSE')
    // One chip per arrow plus the Escape chip.
    expect(markup.match(/data-slot="kbd"/g)).toHaveLength(3)
  })

  test('drops the arrow chips for a single image, keeping only Escape', () => {
    // With no PREV/NEXT controls there is nothing to navigate, so the arrows
    // would be the one hint on the site describing a binding that does nothing.
    const markup = renderToStaticMarkup(createElement(MediaViewerKeyHint, { hasMultiple: false }))

    expect(markup).toContain('media-viewer-key-hint')
    expect(markup).toContain('ESC')
    expect(markup).toContain('CLOSE')
    expect(markup).not.toContain('NAVIGATE')
    expect(markup).not.toContain('←')
    expect(markup).not.toContain('→')
    expect(markup.match(/data-slot="kbd"/g)).toHaveLength(1)
  })
})
