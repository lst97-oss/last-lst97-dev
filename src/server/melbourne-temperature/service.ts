import { z } from 'zod'

import type { Logger } from '../observability/logger'

// The system-bar temperature for Melbourne. Two upstream endpoints, tried in
// order: the Bureau of Meteorology hourly series (the authoritative local
// observation) and the global forecast `current` block as a fallback.
//
// This lives on the server so one in-memory entry serves every visitor: the
// header rendered it client-side, which meant an open-meteo request per browser
// tab on mount plus one every 30 minutes. The reading is stable for the hour, so
// it is fetched at most once an hour per instance and arrives in the SSR payload
// rather than flashing `—` into the header.
const TEMPERATURE_CACHE_TTL_MS = 60 * 60 * 1000
const MELBOURNE_LATITUDE = '-37.8136'
const MELBOURNE_LONGITUDE = '144.9631'
const MELBOURNE_TIMEZONE = 'Australia/Melbourne'

const bomUrl = new URL('https://api.open-meteo.com/v1/bom')
bomUrl.search = new URLSearchParams({
  latitude: MELBOURNE_LATITUDE,
  longitude: MELBOURNE_LONGITUDE,
  hourly: 'temperature_2m',
  temperature_unit: 'celsius',
  timezone: MELBOURNE_TIMEZONE,
  forecast_days: '1',
}).toString()

const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
forecastUrl.search = new URLSearchParams({
  latitude: MELBOURNE_LATITUDE,
  longitude: MELBOURNE_LONGITUDE,
  current: 'temperature_2m',
  temperature_unit: 'celsius',
  timezone: MELBOURNE_TIMEZONE,
}).toString()

// Only the fields actually read are declared; everything else passes through
// unused. A malformed upstream body degrades to `null` instead of throwing.
//
// open-meteo emits `null` for an hour it has no observation for, so the series is
// `(number | null)[]`: rejecting the whole payload over one missing hour would
// silently discard a good reading for every other hour of the day.
const bomSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number().nullable()),
  }),
})

const forecastSchema = z.object({
  current: z.object({ temperature_2m: z.number() }),
})

const MELBOURNE_BOM_PARTS = new Intl.DateTimeFormat('en', {
  timeZone: MELBOURNE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

/**
 * The BOM endpoint returns an hourly series in Melbourne wall-clock time, so the
 * current hour has to be resolved in that zone rather than in the server's own
 * timezone; matching by UTC hour would read the wrong observation.
 */
function getBomTemperature(payload: unknown, now: Date): number | null {
  const parsed = bomSchema.safeParse(payload)
  if (!parsed.success) return null

  const parts = MELBOURNE_BOM_PARTS.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  const currentHour = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:`
  if (currentHour.includes('undefined')) return null

  const { time, temperature_2m } = parsed.data.hourly
  const temperature = temperature_2m[time.findIndex((entry) => entry.startsWith(currentHour))]

  return Number.isFinite(temperature) ? temperature : null
}

function getForecastTemperature(payload: unknown): number | null {
  const parsed = forecastSchema.safeParse(payload)
  return parsed.success ? parsed.data.current.temperature_2m : null
}

export interface MelbourneTemperatureConfig {
  fetcher?: (input: URL, init?: RequestInit) => Promise<Response>
  logger: Pick<Logger, 'warn'>
  timeoutMs?: number
  now?: () => number
  nowDate?: () => Date
}

export interface MelbourneTemperatureReader {
  getTemperature(): Promise<number | null>
}

export function createMelbourneTemperatureReader(config: MelbourneTemperatureConfig): MelbourneTemperatureReader {
  const fetcher = config.fetcher ?? fetch
  const timeoutMs = config.timeoutMs ?? 5_000
  const now = config.now ?? Date.now
  const nowDate = config.nowDate ?? (() => new Date())

  let cachedTemperature: number | null = null
  let cachedAtMs = Number.NEGATIVE_INFINITY
  let inFlight: Promise<number | null> | null = null

  async function request(url: URL, parse: (payload: unknown) => number | null): Promise<number | null> {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (!response.ok) return null

      return parse(await response.json())
    } catch (error) {
      config.logger.warn('melbourne.temperature.request_failed', { error })
      return null
    }
  }

  async function loadTemperature(): Promise<number | null> {
    const bom = await request(bomUrl, (payload) => getBomTemperature(payload, nowDate()))
    return bom ?? request(forecastUrl, getForecastTemperature)
  }

  return {
    async getTemperature(): Promise<number | null> {
      if (cachedTemperature !== null && now() - cachedAtMs < TEMPERATURE_CACHE_TTL_MS) return cachedTemperature

      inFlight ??= loadTemperature()
        .then((temperature) => {
          // Only a real reading is cached: the `!== null` guard above already
          // forces a refetch after a failure, so an open-meteo outage is never
          // pinned for the whole hour.
          if (temperature !== null) {
            cachedTemperature = temperature
            cachedAtMs = now()
          }

          return temperature
        })
        .finally(() => {
          inFlight = null
        })

      return inFlight
    },
  }
}
