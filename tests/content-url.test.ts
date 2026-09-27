import { describe, expect, test } from 'bun:test'

import {
  safeAssetHref as safeAssetHrefFromLegacyPath,
  safeContentHref as safeContentHrefFromLegacyPath,
} from '../src/lib/content-url'
import { safeAssetHref, safeContentHref } from '../src/lib/content/url'

describe('content URL helpers', () => {
  test('allows safe content links and rejects executable or control-character URLs', () => {
    expect(safeContentHref('/projects/demo')).toBe('/projects/demo')
    expect(safeContentHref('mailto:hello@example.com')).toBe('mailto:hello@example.com')
    expect(safeContentHref('javascript:alert(1)')).toBeNull()
    expect(safeContentHref('https://example.com/\nunsafe')).toBeNull()
  })

  test('allows web asset URLs but rejects non-web protocols', () => {
    expect(safeAssetHref('/images/project.webp')).toBe('/images/project.webp')
    expect(safeAssetHref('https://cdn.example.com/project.webp')).toBe('https://cdn.example.com/project.webp')
    expect(safeAssetHref('mailto:hello@example.com')).toBeNull()
    expect(safeAssetHref('javascript:alert(1)')).toBeNull()
  })

  test('keeps the original import path compatible during the folder move', () => {
    expect(safeContentHrefFromLegacyPath('/projects/demo')).toBe('/projects/demo')
    expect(safeAssetHrefFromLegacyPath('/images/project.webp')).toBe('/images/project.webp')
  })
})
