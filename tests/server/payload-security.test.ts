import { describe, expect, it } from 'bun:test'

import {
  LOCALHOST_URL,
  PayloadServerUrlError,
  resolvePayloadServerUrl,
} from '../../src/server/security/payload-server-url'
import { denyUserCreation } from '../../src/collections/access'

describe('resolvePayloadServerUrl', () => {
  it('prefers PAYLOAD_PUBLIC_SERVER_URL and strips any path', () => {
    expect(resolvePayloadServerUrl({
      PAYLOAD_PUBLIC_SERVER_URL: 'https://example.com',
      NODE_ENV: 'production',
    })).toBe('https://example.com')

    expect(resolvePayloadServerUrl({
      PAYLOAD_PUBLIC_SERVER_URL: 'https://example.com/some/path?x=1',
      NODE_ENV: 'production',
    })).toBe('https://example.com')
  })

  it('falls back to PUBLIC_SITE_URL so canonical and admin origins cannot drift', () => {
    expect(resolvePayloadServerUrl({
      PUBLIC_SITE_URL: 'https://lastos.test',
      NODE_ENV: 'production',
    })).toBe('https://lastos.test')
  })

  it('allows localhost in development', () => {
    expect(resolvePayloadServerUrl({})).toBe(LOCALHOST_URL)
    expect(resolvePayloadServerUrl({ NODE_ENV: 'development' })).toBe(LOCALHOST_URL)
  })

  it('rejects a loopback origin in production', () => {
    // The exact failure this guards: a copied .env shipping localhost to
    // production silently weakens cookie security and CORS origin checks.
    for (const host of ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://app.localhost']) {
      expect(() => resolvePayloadServerUrl({
        PAYLOAD_PUBLIC_SERVER_URL: host,
        NODE_ENV: 'production',
      })).toThrow(PayloadServerUrlError)
    }
  })

  it('rejects plain http in production', () => {
    expect(() => resolvePayloadServerUrl({
      PAYLOAD_PUBLIC_SERVER_URL: 'http://example.com',
      NODE_ENV: 'production',
    })).toThrow(/https/)
  })

  it('rejects a missing origin in production', () => {
    expect(() => resolvePayloadServerUrl({ NODE_ENV: 'production' }))
      .toThrow(PayloadServerUrlError)
  })

  it('rejects a malformed origin', () => {
    expect(() => resolvePayloadServerUrl({ PAYLOAD_PUBLIC_SERVER_URL: 'not a url' }))
      .toThrow(PayloadServerUrlError)
  })
})

describe('denyUserCreation', () => {
  it('denies user creation regardless of the request', () => {
    // The guard accepts the AccessArgs Payload passes but never reads them:
    // there is no legitimate caller, so every call shape is a denial.
    expect(denyUserCreation()).toBe(false)
    expect(denyUserCreation({ req: { user: { id: '1' } } })).toBe(false)
  })
})
