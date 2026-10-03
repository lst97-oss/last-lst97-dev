import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminNotFound } from '../src/lib/payload/admin-not-found'
import { adminNotFoundElement } from '../src/lib/payload/admin-not-found-element'

/**
 * The boundary either renders the RSC tree the loader forwarded or falls back
 * to Payload's bare client view. Which branch runs is decided by data the
 * router hands over as `unknown`, so both shapes are pinned here — a boundary
 * that fell through to the site page would render neither.
 *
 * `NotFoundClient` itself needs Payload's provider contexts and cannot be
 * rendered standalone, so the fallback is asserted through the selector that
 * decides it.
 */
describe('admin not-found boundary', () => {
  test('renders the forwarded RSC element', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminNotFound, {
        data: { element: createElement('main', { id: 'payload-404' }, 'Not Found') },
      }),
    )

    expect(markup).toContain('id="payload-404"')
    expect(markup).toContain('Not Found')
    // The site 404 page renders inside an OS window; Payload's tree does not.
    expect(markup).not.toContain('window-frame')
  })

  test('selects the fallback whenever no payload was forwarded', () => {
    // TanStack raises not-found without data for a miss raised outside the
    // loader, so every one of these must fall through rather than render junk.
    expect(adminNotFoundElement(undefined)).toBeUndefined()
    expect(adminNotFoundElement(null)).toBeUndefined()
    expect(adminNotFoundElement('not-found')).toBeUndefined()
    expect(adminNotFoundElement({})).toBeUndefined()
    expect(adminNotFoundElement({ element: null })).toBeUndefined()
    expect(adminNotFoundElement({ other: 'payload' })).toBeUndefined()
  })

  test('keeps a forwarded element even when it is falsy-safe', () => {
    // `0` and `''` are legal React children; a naive truthiness check here
    // would silently drop a real subtree for the bare fallback.
    expect(adminNotFoundElement({ element: 0 })).toBe(0)
    expect(adminNotFoundElement({ element: '' })).toBe('')

    const markup = renderToStaticMarkup(
      createElement(AdminNotFound, { data: { element: createElement('span', null, 'zero') } }),
    )
    expect(markup).toContain('<span>zero</span>')
  })
})
