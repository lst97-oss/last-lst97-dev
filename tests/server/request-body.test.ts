import { describe, expect, it } from 'bun:test'

import { readJsonBody } from '../../src/server/http/request'

describe('readJsonBody', () => {
  it('rejects a request body above the endpoint byte limit', async () => {
    const result = await readJsonBody(
      new Request('https://example.test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'x'.repeat(40) }),
      }),
      16,
    )
    expect(result).toEqual({ ok: false, reason: 'too_large' })
  })

  it('parses valid JSON and distinguishes malformed JSON', async () => {
    await expect(
      readJsonBody(
        new Request('https://example.test', {
          method: 'POST',
          body: JSON.stringify({ hello: true }),
        }),
        100,
      ),
    ).resolves.toEqual({ ok: true, value: { hello: true } })
    await expect(
      readJsonBody(new Request('https://example.test', { method: 'POST', body: '{' }), 100),
    ).resolves.toEqual({ ok: false, reason: 'invalid_json' })
  })
})
