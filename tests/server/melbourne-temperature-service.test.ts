import { expect, test } from 'bun:test'
import {
  createMelbourneTemperatureReader,
  type MelbourneTemperatureConfig,
} from '../../src/server/melbourne-temperature/service'
import type { Logger } from '../../src/server/observability/logger'

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

// 2026-10-02T03:00:00.000Z is 13:00 in Melbourne (AEST, UTC+10), and the BOM
// series is keyed by Melbourne wall-clock hours, so entries must span distinct
// hours: the reader picks the one matching the current hour. Index 3 is 13:00.
const MELBOURNE_NOON = new Date('2026-10-02T03:00:00.000Z')

function bomPayload(temperatures: (number | null)[]) {
  return {
    hourly: {
      time: temperatures.map((_, index) => `2026-10-02T${String(index + 10).padStart(2, '0')}:00`),
      temperature_2m: temperatures,
    },
  }
}

function createReader(config: Partial<MelbourneTemperatureConfig> = {}) {
  const requested: string[] = []
  const { logger, warnings } = createLoggerSpy()
  const reader = createMelbourneTemperatureReader({
    logger,
    nowDate: () => MELBOURNE_NOON,
    fetcher: async (input) => {
      requested.push(String(input))
      return new Response(JSON.stringify(bomPayload([10, 11.4, null, 13, 9])), { status: 200 })
    },
    ...config,
  })

  return { reader, requested, warnings }
}

test('reads the current Melbourne hour from the Bureau of Meteorology series', async () => {
  const { reader, requested } = createReader()

  // Index 3 is the 13:00 Melbourne observation; the nulls and the neighbouring
  // hours must not be mistaken for it.
  expect(await reader.getTemperature()).toBe(13)
  // The BOM endpoint answered, so the forecast fallback is never requested.
  expect(requested).toHaveLength(1)
  expect(requested[0]).toContain('api.open-meteo.com/v1/bom')
})

test('falls back to the forecast endpoint when the BOM series has no current hour', async () => {
  const { reader, requested } = createReader({
    fetcher: async (input) => {
      const url = String(input)
      requested.push(url)
      // Every observation belongs to a different hour than the current one.
      if (url.includes('/v1/bom')) return new Response(JSON.stringify(bomPayload([1, 2])), { status: 200 })

      return new Response(JSON.stringify({ current: { temperature_2m: 16.2 } }), { status: 200 })
    },
  })

  expect(await reader.getTemperature()).toBe(16.2)
  expect(requested).toHaveLength(2)
  expect(requested[1]).toContain('api.open-meteo.com/v1/forecast')
})

test('falls back to the forecast endpoint when the BOM request throws', async () => {
  const requested: string[] = []
  const { logger, warnings } = createLoggerSpy()
  const reader = createMelbourneTemperatureReader({
    logger,
    nowDate: () => MELBOURNE_NOON,
    fetcher: async (input) => {
      const url = String(input)
      requested.push(url)
      if (url.includes('/v1/bom')) throw new Error('network down')

      return new Response(JSON.stringify({ current: { temperature_2m: 8.5 } }), { status: 200 })
    },
  })

  expect(await reader.getTemperature()).toBe(8.5)
  expect(requested).toHaveLength(2)
  expect(warnings[0]).toMatchObject({ event: 'melbourne.temperature.request_failed' })
})

test('returns null when both endpoints fail, without throwing', async () => {
  const { reader } = createReader({ fetcher: async () => new Response('unavailable', { status: 503 }) })

  expect(await reader.getTemperature()).toBeNull()
})

test('caches a reading for an hour instead of refetching on every request', async () => {
  let clockMs = 1_000
  let requests = 0
  const { reader } = createReader({
    now: () => clockMs,
    fetcher: async () => {
      requests += 1
      // The 13:00 observation changes between calls, so a stale cache is visible
      // in the returned value and not only in the call count.
      return new Response(JSON.stringify(bomPayload([10, 11.4, null, requests, 9])), { status: 200 })
    },
  })

  expect(await reader.getTemperature()).toBe(1)
  expect(await reader.getTemperature()).toBe(1)
  expect(requests).toBe(1)

  // Just inside the window: still the cached reading.
  clockMs += 60 * 60 * 1000 - 1
  expect(await reader.getTemperature()).toBe(1)
  expect(requests).toBe(1)

  // Past one hour: refetched, and the new observation wins.
  clockMs += 1
  expect(await reader.getTemperature()).toBe(2)
  expect(requests).toBe(2)
})

test('never caches a failure, so an outage recovers on the next call', async () => {
  let forecastCalls = 0
  const { reader } = createReader({
    fetcher: async (input) => {
      if (String(input).includes('/v1/bom')) return new Response('unavailable', { status: 503 })

      forecastCalls += 1
      if (forecastCalls === 1) return new Response('unavailable', { status: 503 })

      return new Response(JSON.stringify({ current: { temperature_2m: 14 } }), { status: 200 })
    },
  })

  // First read exhausts both endpoints and yields null.
  expect(await reader.getTemperature()).toBeNull()
  expect(forecastCalls).toBe(1)

  // The null was not pinned for the hour: the next read recovers.
  expect(await reader.getTemperature()).toBe(14)
  expect(forecastCalls).toBe(2)
})

test('collapses concurrent reads into a single upstream request', async () => {
  let requests = 0
  // Gate the fetch so the first read is provably still in flight when the other
  // two arrive; no wall-clock wait, so there is no race to flake on.
  const fetchGate = Promise.withResolvers<void>()
  const { reader } = createReader({
    fetcher: async () => {
      requests += 1
      await fetchGate.promise
      return new Response(JSON.stringify(bomPayload([10, 11.4, null, 19, 9])), { status: 200 })
    },
  })

  const pending = Promise.all([reader.getTemperature(), reader.getTemperature(), reader.getTemperature()])
  fetchGate.resolve()

  expect(await pending).toEqual([19, 19, 19])
  expect(requests).toBe(1)
})
