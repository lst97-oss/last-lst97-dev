import { describe, expect, test } from 'bun:test'
import { buildAdminRenderParams } from '../src/lib/payload-admin-route'

describe('Payload admin route params', () => {
  test('does not turn the admin root into a trailing-slash route', () => {
    expect(buildAdminRenderParams([])).toEqual({})
  })

  test('preserves non-root admin segments', () => {
    expect(buildAdminRenderParams(['collections', 'posts'])).toEqual({
      segments: ['collections', 'posts'],
    })
  })
})
