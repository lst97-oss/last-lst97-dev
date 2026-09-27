import { expect, test } from 'bun:test'

import type { Logger } from '../../src/server/observability/logger'

const module = await import('../../src/server/wakatime/service').catch(() => null)

function createLoggerSpy() {
  const warnings: { event: string; fields?: Record<string, unknown> }[] = []
  const logger: Logger = {
    debug: () => {},
    info: () => {},
    warn: (event, fields) => warnings.push({ event, fields }),
    error: () => {},
  }

  return { logger, warnings }
}

test('fetches and validates the live public WakaTime snapshot', async () => {
  expect(module).not.toBeNull()
  if (!module) return

  const endpoint = 'https://wakatime.com/share/@lst97/93993eb7-ae0d-41d1-b44d-6bcf2f02ceb0.json'
  const payload = {
    data: {
      grand_total: {
        human_readable_total_including_other_language: '3,260 hrs 21 mins',
      },
      range: { range: 'all_time' },
    },
  }
  let requestedUrl = ''
  const { logger, warnings } = createLoggerSpy()
  const reader = module.createWakaTimeReader({
    endpoint,
    fetcher: async (input, init) => {
      requestedUrl = String(input)
      expect(new Headers(init?.headers).get('accept')).toBe('application/json')
      return new Response(JSON.stringify(payload), { status: 200 })
    },
    logger,
  })

  const result = await reader.getSnapshot()

  expect(requestedUrl).toBe(endpoint)
  expect(result?.stats.data.grand_total.human_readable_total_including_other_language).toBe('3,260 hrs 21 mins')
  expect(JSON.parse(result?.rawJson ?? 'null')).toEqual(payload)
  expect(warnings).toHaveLength(0)
})

test('returns a graceful empty result and logs when WakaTime is unavailable', async () => {
  expect(module).not.toBeNull()
  if (!module) return

  const { logger, warnings } = createLoggerSpy()
  const reader = module.createWakaTimeReader({
    endpoint: 'https://wakatime.com/share/@lst97/example.json',
    fetcher: async () => new Response('unavailable', { status: 503 }),
    logger,
  })

  await expect(reader.getSnapshot()).resolves.toBeNull()
  expect(warnings).toContainEqual({
    event: 'wakatime.snapshot.request_failed',
    fields: { status: 503 },
  })
})
