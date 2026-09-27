import { describe, expect, it } from 'bun:test'

import { parseContactInput } from '../../src/server/contact/validation'

describe('parseContactInput', () => {
  it('accepts a valid contact message and trims whitespace', () => {
    const result = parseContactInput({
      name: '  Ada Lovelace  ',
      email: 'ada@example.com',
      message: '  I would like to work together.  ',
      website: '',
    })

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'I would like to work together.',
        website: '',
      },
    })
  })

  it('rejects malformed email addresses before delivery', () => {
    const result = parseContactInput({
      name: 'Ada',
      email: 'not-an-email',
      message: 'A message with enough characters.',
      website: '',
    })

    expect(result.ok).toBe(false)
  })

  it('marks a filled honeypot as a bot without exposing validation details', () => {
    const result = parseContactInput({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'A message with enough characters.',
      website: 'https://bot.example',
    })

    expect(result).toEqual({ ok: true, honeypot: true })
  })
})
