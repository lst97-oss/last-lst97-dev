import { describe, expect, test } from 'bun:test'

import {
  CHAT_BROWSER_REQUIREMENTS,
  CONTACT_BROWSER_REQUIREMENTS,
  inspectBrowserCapabilities,
} from '../src/lib/browser-capabilities'

const availableRuntime = {
  fetch: (() => Promise.resolve(new Response())) as unknown as typeof fetch,
  AbortController,
  ReadableStream,
  TextDecoder,
}

describe('browser capability inspection', () => {
  test('accepts the current chat requirements when all required APIs are available', () => {
    expect(inspectBrowserCapabilities(CHAT_BROWSER_REQUIREMENTS, availableRuntime)).toEqual({
      supported: true,
      missing: [],
    })
  })

  test('reports only the missing APIs in requirement order', () => {
    expect(
      inspectBrowserCapabilities(CHAT_BROWSER_REQUIREMENTS, {
        ...availableRuntime,
        AbortController: undefined,
        TextDecoder: undefined,
      }),
    ).toEqual({
      supported: false,
      missing: ['abort-controller', 'text-decoder'],
    })
  })

  test('checks each feature against its own requirements', () => {
    expect(inspectBrowserCapabilities(CONTACT_BROWSER_REQUIREMENTS, { fetch: availableRuntime.fetch })).toEqual({
      supported: true,
      missing: [],
    })
    expect(inspectBrowserCapabilities(CONTACT_BROWSER_REQUIREMENTS, { fetch: undefined })).toEqual({
      supported: false,
      missing: ['fetch'],
    })
  })
})
