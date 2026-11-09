import { afterEach, describe, expect, it, spyOn } from 'bun:test'

import { logger } from '../../src/server/observability/logger'

const SETTINGS = ['LOG_LEVEL', 'LOG_FORMAT', 'LOG_COLOR', 'NO_COLOR'] as const

afterEach(() => {
  for (const name of SETTINGS) delete process.env[name]
})

// The app's logger applies its redaction policy (redact.ts) to every line, in both formats. These pin that policy:
// an error keeps only its name, and secret-named, message-named or stack fields never reach the output.
describe('app logger redaction', () => {
  it('does not serialize sensitive error messages', () => {
    process.env.LOG_FORMAT = 'json'
    const write = spyOn(console, 'error').mockImplementation(() => {})
    const sensitiveErrorMessage = 'SMTP rejected sender ada@example.com with token secret-value'

    try {
      logger.error('contact.failed', {
        requestId: 'request-1',
        error: new Error(sensitiveErrorMessage),
      })

      const serialized = String(write.mock.calls[0]?.[0])
      expect(serialized).not.toContain(sensitiveErrorMessage)
      expect(serialized).not.toContain('ada@example.com')
      expect(serialized).not.toContain('secret-value')
      expect(JSON.parse(serialized)).toMatchObject({
        msg: 'contact.failed',
        error: { name: 'Error' },
        requestId: 'request-1',
      })
    } finally {
      write.mockRestore()
    }
  })

  it('redacts secret-named and message-named fields', () => {
    process.env.LOG_FORMAT = 'json'
    const write = spyOn(console, 'info').mockImplementation(() => {})
    try {
      logger.info('chat.turn', { apiKey: 'key-value', password: 'pw-value', message: 'hello there', route: '/chat' })

      const serialized = String(write.mock.calls[0]?.[0])
      expect(serialized).not.toContain('key-value')
      expect(serialized).not.toContain('pw-value')
      expect(serialized).not.toContain('hello there')
      expect(JSON.parse(serialized)).toMatchObject({ apiKey: '[redacted]', message: '[redacted]', route: '/chat' })
    } finally {
      write.mockRestore()
    }
  })

  it('masks an email address inside any string value, under any key', () => {
    process.env.LOG_FORMAT = 'json'
    const write = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      logger.warn('contact.lookup', { detail: 'Key (email)=(ada@example.com) already exists', route: '/contact' })

      const serialized = String(write.mock.calls[0]?.[0])
      expect(serialized).not.toContain('ada@example.com')
      expect(JSON.parse(serialized)).toMatchObject({
        detail: 'Key (email)=([email]) already exists',
        route: '/contact',
      })
    } finally {
      write.mockRestore()
    }
  })

  it('redacts a stack, because its first line repeats the message', () => {
    process.env.LOG_FORMAT = 'json'
    const write = spyOn(console, 'error').mockImplementation(() => {})
    try {
      logger.error('save.failed', { stack: 'Error: duplicate key (email)=(ada@example.com)\n    at insert' })

      const serialized = String(write.mock.calls[0]?.[0])
      expect(serialized).not.toContain('ada@example.com')
      expect(JSON.parse(serialized)).toMatchObject({ stack: '[redacted]' })
    } finally {
      write.mockRestore()
    }
  })
})

describe('console output', () => {
  it('the default floor is info, so debug stays quiet', () => {
    const debug = spyOn(console, 'debug').mockImplementation(() => {})
    const info = spyOn(console, 'info').mockImplementation(() => {})
    logger.debug('quiet')
    logger.info('loud')
    expect(debug).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledTimes(1)
    debug.mockRestore()
    info.mockRestore()
  })

  it('LOG_LEVEL=debug writes debug lines', () => {
    process.env.LOG_LEVEL = 'debug'
    const debug = spyOn(console, 'debug').mockImplementation(() => {})
    logger.debug('visible')
    expect(debug).toHaveBeenCalledTimes(1)
    debug.mockRestore()
  })

  it('LOG_FORMAT=json writes one JSON object per line', () => {
    process.env.LOG_FORMAT = 'json'
    const info = spyOn(console, 'info').mockImplementation(() => {})
    logger.info('hello', { a: 1 })
    expect(() => JSON.parse(String(info.mock.calls[0]?.[0]))).not.toThrow()
    info.mockRestore()
  })

  it('LOG_FORMAT=pretty writes the readable line even when not on a terminal', () => {
    process.env.LOG_FORMAT = 'pretty'
    const info = spyOn(console, 'info').mockImplementation(() => {})
    logger.info('hello', { a: 1 })
    expect(() => JSON.parse(String(info.mock.calls[0]?.[0]))).toThrow()
    expect(String(info.mock.calls[0]?.[0])).toContain('INFO  hello a=1')
    info.mockRestore()
  })

  it('LOG_COLOR=always colours a pretty line, and never does not', () => {
    process.env.LOG_FORMAT = 'pretty'
    const info = spyOn(console, 'info').mockImplementation(() => {})
    process.env.LOG_COLOR = 'always'
    logger.info('coloured')
    process.env.LOG_COLOR = 'never'
    logger.info('plain')
    expect(String(info.mock.calls[0]?.[0])).toContain('\x1b[')
    expect(String(info.mock.calls[1]?.[0])).not.toContain('\x1b')
    info.mockRestore()
  })
})
