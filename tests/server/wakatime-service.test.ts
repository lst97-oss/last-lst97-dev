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
  expect(JSON.parse(result?.formattedJson ?? 'null')).toEqual(payload)
  expect(warnings).toHaveLength(0)
})

test('serves the cached snapshot for an hour instead of refetching per load', async () => {
  expect(module).not.toBeNull()
  if (!module) return

  let clockMs = 1_000
  let requests = 0
  const { logger } = createLoggerSpy()
  const reader = module.createWakaTimeReader({
    endpoint: 'https://wakatime.com/share/@lst97/cached.json',
    fetcher: async () => {
      requests += 1
      return new Response(
        JSON.stringify({
          data: { grand_total: { human_readable_total_including_other_language: `${requests} hrs` } },
        }),
        { status: 200 },
      )
    },
    logger,
    now: () => clockMs,
  })

  await reader.getSnapshot()
  const second = await reader.getSnapshot()

  expect(requests).toBe(1)
  expect(second?.stats.data.grand_total.human_readable_total_including_other_language).toBe('1 hrs')

  // Just inside the window: still cached.
  clockMs += 60 * 60 * 1000 - 1
  await reader.getSnapshot()
  expect(requests).toBe(1)

  // Past one hour: refetched.
  clockMs += 1
  const refreshed = await reader.getSnapshot()
  expect(requests).toBe(2)
  expect(refreshed?.stats.data.grand_total.human_readable_total_including_other_language).toBe('2 hrs')
})

test('never caches a failed fetch, so an outage recovers on the next call', async () => {
  expect(module).not.toBeNull()
  if (!module) return

  const { logger, warnings } = createLoggerSpy()
  let requests = 0
  const reader = module.createWakaTimeReader({
    endpoint: 'https://wakatime.com/share/@lst97/flaky.json',
    fetcher: async () => {
      requests += 1
      if (requests === 1) return new Response('unavailable', { status: 503 })
      return new Response(
        JSON.stringify({
          data: { grand_total: { human_readable_total_including_other_language: '12 hrs' } },
        }),
        { status: 200 },
      )
    },
    logger,
  })

  await expect(reader.getSnapshot()).resolves.toBeNull()
  await expect(reader.getSnapshot()).resolves.toMatchObject({
    stats: { data: { grand_total: { human_readable_total_including_other_language: '12 hrs' } } },
  })
  expect(requests).toBe(2)
  expect(warnings).toContainEqual({
    event: 'wakatime.snapshot.request_failed',
    fields: { status: 503 },
  })
})

test('collapses concurrent loads into a single upstream request', async () => {
  expect(module).not.toBeNull()
  if (!module) return

  let requests = 0
  // Gate the fetch so the first call is provably still in flight when the other
  // two arrive; no wall-clock wait, so there is no race to flake on.
  const fetchGate = Promise.withResolvers<void>()
  const { logger } = createLoggerSpy()
  const reader = module.createWakaTimeReader({
    endpoint: 'https://wakatime.com/share/@lst97/concurrent.json',
    fetcher: async () => {
      requests += 1
      await fetchGate.promise
      return new Response(
        JSON.stringify({
          data: { grand_total: { human_readable_total_including_other_language: '7 hrs' } },
        }),
        { status: 200 },
      )
    },
    logger,
  })

  const pending = Promise.all([reader.getSnapshot(), reader.getSnapshot(), reader.getSnapshot()])
  fetchGate.resolve()
  const results = await pending

  expect(requests).toBe(1)
  for (const result of results) {
    expect(result?.stats.data.grand_total.human_readable_total_including_other_language).toBe('7 hrs')
  }
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
