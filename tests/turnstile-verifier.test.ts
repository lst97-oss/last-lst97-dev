import { describe, expect, it } from 'bun:test'

import { createTurnstileVerifier } from '../src/server/contact/turnstile-verifier'

// Cloudflare's documented dummy secret. Its siteverify payload is shaped
// differently from a real one: no `action` field at all, and a fixed
// `hostname: "example.com"`. See tests/turnstile-dummy-keys.md.
const TEST_SECRET = '1x0000000000000000000000000000000AA'
const FAILING_SECRET = '2x0000000000000000000000000000000AA'
const PRODUCTION_SECRET = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'

/** A siteverify responder shaped like the real endpoint's answers. */
function siteverify(payload: Record<string, unknown>) {
  return async () =>
    new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json' },
    })
}

const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

describe('turnstile verifier with Cloudflare dummy keys', () => {
  it('accepts a success payload that omits action and reports the dummy hostname', async () => {
    const verify = createTurnstileVerifier({
      secret: TEST_SECRET,
      action: 'chat_message',
      // Exactly what the dummy secret returns: no `action`, hostname "example.com".
      fetcher: siteverify({ success: true, hostname: 'example.com', challenge_ts: 'now', 'error-codes': [] }),
    })

    expect(await verify.verify(DUMMY_TOKEN, 'localhost')).toBe(true)
  })

  it('still rejects a failure payload under the dummy secret', async () => {
    const verify = createTurnstileVerifier({
      secret: TEST_SECRET,
      action: 'chat_message',
      fetcher: siteverify({ success: false, 'error-codes': ['invalid-input-response'] }),
    })

    expect(await verify.verify(DUMMY_TOKEN, 'localhost')).toBe(false)
  })

  it('keeps the strict action and hostname checks for a production secret', async () => {
    // The dummy bypass must not weaken production: a real secret still has to
    // see the right action and the requesting hostname.
    const verifier = (hostname: string, action: string) =>
      createTurnstileVerifier({
        secret: PRODUCTION_SECRET,
        action: 'chat_message',
        fetcher: siteverify({ success: true, hostname, action }),
      })

    expect(await verifier('www.lst97.dev', 'chat_message').verify(DUMMY_TOKEN, 'www.lst97.dev')).toBe(true)
    expect(await verifier('www.lst97.dev', 'contact').verify(DUMMY_TOKEN, 'www.lst97.dev')).toBe(false)
    expect(await verifier('evil.example', 'chat_message').verify(DUMMY_TOKEN, 'www.lst97.dev')).toBe(false)
  })

  it('rejects a malformed provider payload for every secret', async () => {
    for (const secret of [TEST_SECRET, FAILING_SECRET, PRODUCTION_SECRET]) {
      const verify = createTurnstileVerifier({
        secret,
        action: 'chat_message',
        fetcher: async () => new Response('not json', { headers: { 'content-type': 'application/json' } }),
      })

      expect(verify.verify(DUMMY_TOKEN, 'localhost')).rejects.toThrow('Turnstile verification is unavailable')
    }
  })
})
