import { afterEach, expect, test } from 'bun:test'

import { destroyCachedPayloads } from '@/payload/payload-shutdown'

const cache = globalThis as Record<string, unknown>

afterEach(() => {
  delete cache._payload
})

test('destroys every cached Payload instance and reports each outcome', async () => {
  const destroyed: string[] = []
  cache._payload = new Map<string, unknown>([
    ['a', { destroy: async () => void destroyed.push('a') }],
    ['b', { destroy: () => void destroyed.push('b') }],
    ['c', {}],
  ])

  const results = await destroyCachedPayloads()

  expect(destroyed.sort()).toEqual(['a', 'b'])
  expect(results.every((result) => result.status === 'fulfilled')).toBe(true)
})
