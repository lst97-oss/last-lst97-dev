import { describe, expect, test } from 'bun:test'
import {
  buildAdminRenderRequest,
  buildAdminRenderParams,
  getAdminRenderIntent,
  parseAdminSearchParams,
} from '../src/lib/payload/admin-route'

describe('Payload admin route params', () => {
  test('keeps the empty splat array in the server render request', () => {
    expect(buildAdminRenderRequest('?view=list', [])).toEqual({
      search: { view: 'list' },
      segments: [],
    })
  })

  test('does not turn the admin root into a trailing-slash route', () => {
    expect(buildAdminRenderParams([])).toEqual({})
  })

  test('preserves non-root admin segments', () => {
    expect(buildAdminRenderParams(['collections', 'posts'])).toEqual({
      segments: ['collections', 'posts'],
    })
  })

  test('parses admin search parameters with the current last-value behavior', () => {
    expect(parseAdminSearchParams('?view=list&filter=draft&filter=published')).toEqual({
      view: 'list',
      filter: 'published',
    })
  })

  test('normalizes render intents for both admin routes', () => {
    expect(getAdminRenderIntent({ type: 'redirect', url: '/admin/login' })).toEqual({
      type: 'redirect',
      url: '/admin/login',
    })
    expect(getAdminRenderIntent({ type: 'notFound' })).toEqual({ type: 'not-found' })
    expect(getAdminRenderIntent(null)).toEqual({ type: 'render' })
    expect(getAdminRenderIntent({ type: 'redirect' })).toEqual({ type: 'render' })
  })
})
