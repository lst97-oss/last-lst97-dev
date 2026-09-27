import { describe, expect, it, spyOn } from 'bun:test'

import { JsonLogger } from '../../src/server/observability/logger'

describe('JsonLogger', () => {
  it('does not serialize sensitive error messages', () => {
    const write = spyOn(console, 'error').mockImplementation(() => {})
    const logger = new JsonLogger('debug')
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
        event: 'contact.failed',
        error: { name: 'Error' },
        requestId: 'request-1',
      })
    } finally {
      write.mockRestore()
    }
  })
})
