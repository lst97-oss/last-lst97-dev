import { describe, expect, test } from 'bun:test'

import sanitizeFilename from '../vendor/sanitize-filename'

describe('browser compatibility shims', () => {
  test('sanitizes Payload upload filenames without Node require', () => {
    expect(sanitizeFilename('report?.pdf')).toBe('report.pdf')
    expect(sanitizeFilename('report?.pdf', { replacement: '_' })).toBe('report_.pdf')
  })

  test('truncates by UTF-8 byte length without splitting a code point', () => {
    const output = sanitizeFilename(`${'😀'.repeat(100)}.png`)
    expect(new TextEncoder().encode(output).length).toBeLessThanOrEqual(255)
    expect(output).not.toContain('\uFFFD')
  })
})
