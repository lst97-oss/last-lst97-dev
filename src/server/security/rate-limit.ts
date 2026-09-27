export interface RateLimitStore {
  consume(bucket: string, clientKey: string, windowStartedAt: number): Promise<number>
}

export interface RateLimitOptions {
  limit: number
  windowMs: number
  now?: () => number
}

export function createRateLimiter(store: RateLimitStore, options: RateLimitOptions) {
  const now = options.now ?? Date.now
  return {
    async check(bucket: string, clientKey: string) {
      const timestamp = now()
      const windowStartedAt = Math.floor(timestamp / options.windowMs) * options.windowMs
      const count = await store.consume(bucket, clientKey, windowStartedAt)
      return {
        allowed: count <= options.limit,
        remaining: Math.max(0, options.limit - count),
        retryAfterSeconds: Math.max(1, Math.ceil((windowStartedAt + options.windowMs - timestamp) / 1_000)),
      }
    },
  }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>
