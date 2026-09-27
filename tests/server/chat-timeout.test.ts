import { describe, expect, it, spyOn } from 'bun:test'

import { withTimeout } from '../../src/server/chat/timeout'

describe('chat timeout helper', () => {
  it('returns a completed operation and clears its timer', async () => {
    const clearTimeoutSpy = spyOn(globalThis, 'clearTimeout')
    try {
      await expect(withTimeout(Promise.resolve('ready'), 1_000, 'request timed out')).resolves.toBe('ready')
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
    } finally {
      clearTimeoutSpy.mockRestore()
    }
  })

  it('preserves failures from the operation', async () => {
    const failure = new Error('source failed')
    await expect(withTimeout(Promise.reject(failure), 1_000, 'request timed out')).rejects.toBe(failure)
  })

  it('rejects with the caller supplied timeout message', async () => {
    await expect(withTimeout(new Promise(() => {}), 1, 'planner request timed out'))
      .rejects.toThrow('planner request timed out')
  })
})
