import { describe, expect, it } from 'bun:test'

import {
  computeDurations,
  formatHours,
  parseDumpDay,
  prepareHeartbeatRows,
  sha256Hex,
} from '../../src/server/wakatime/history/import'

describe('computeDurations', () => {
  it('caps gaps at the keystroke timeout and gives the trailing heartbeat zero', () => {
    expect(computeDurations([100, 160, 2000, 2000])).toEqual([60, 900, 0, 0])
  })

  it('handles a single heartbeat', () => {
    expect(computeDurations([100])).toEqual([0])
  })
})

describe('prepareHeartbeatRows', () => {
  const heartbeat = (overrides: Record<string, unknown> = {}) => ({
    id: '018d821d-7e0a-4e9b-a2ad-3780dc0955d1',
    time: 1707284986.493,
    project: 'best-maker-web',
    language: 'TypeScript',
    category: 'Coding',
    type: 'file',
    branch: 'dev',
    entity: '/Users/lst97/work/secret-path/File.ts',
    is_write: false,
    dependencies: ['express', 42, '  '],
    ...overrides,
  })

  it('sorts by time, hashes the entity path, and derives the AI flag', () => {
    const rows = prepareHeartbeatRows('2024-02-07', [
      heartbeat({ time: 200, category: 'AI Coding' }),
      heartbeat({ id: '018d821d-7e0a-4e9b-a2ad-3780dc0955d2', time: 100 }),
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0]?.day).toBe('2024-02-07')
    expect(rows[0]?.durationSeconds).toBe(100)
    expect(rows[0]?.aiCoding).toBe(false)
    expect(rows[1]?.aiCoding).toBe(true)
    expect(rows[0]?.entityHash).toBe(sha256Hex('/Users/lst97/work/secret-path/File.ts'))
    expect(rows[0]?.dependencies).toEqual(['express'])
    expect(JSON.stringify(rows)).not.toContain('secret-path')
  })

  it('drops heartbeats with invalid ids or timestamps', () => {
    const rows = prepareHeartbeatRows('2024-02-07', [
      heartbeat({ id: 'not-a-uuid' }),
      heartbeat({ id: '018d821d-7e0a-4e9b-a2ad-3780dc0955d3', time: Number.NaN }),
      heartbeat(),
    ])
    expect(rows).toHaveLength(1)
  })
})

describe('parseDumpDay', () => {
  it('accepts dated days and rejects malformed entries', () => {
    expect(parseDumpDay({ date: '2024-02-07', heartbeats: [] })?.date).toBe('2024-02-07')
    expect(parseDumpDay({ date: '07-02-2024', heartbeats: [] })).toBeNull()
    expect(parseDumpDay({ heartbeats: [] })).toBeNull()
  })
})

describe('formatHours', () => {
  it('renders human totals', () => {
    expect(formatHours(0)).toBe('0 mins')
    expect(formatHours(1500)).toBe('25 mins')
    expect(formatHours(3600)).toBe('1 hrs')
    expect(formatHours(115800)).toBe('32 hrs 10 mins')
  })
})
