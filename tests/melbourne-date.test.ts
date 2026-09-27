import { describe, expect, test } from 'bun:test'

import { formatMelbourneDate } from '../src/lib/melbourne-date'

describe('Melbourne date formatting', () => {
  test('formats dates in Melbourne time and uppercase display text', () => {
    expect(formatMelbourneDate(new Date('2025-01-02T03:04:05.000Z'))).toContain('02 JAN 2025')
    expect(formatMelbourneDate(new Date('2025-01-02T03:04:05.000Z'))).toContain('14:04:05')
  })
})
