import { getServerEnv, isVercelRuntime, requiredServerEnv } from '../env'
import { clientKeyFromRequest } from './client-key'
import { createPostgresRateLimitStore } from './postgres-rate-limit-store'
import { createRateLimiter } from './rate-limit'

const store = createPostgresRateLimitStore()

const HOUR_MS = 60 * 60 * 1_000
// Comment writes come from the host's proxy, one visitor per client key. Reads are not limited.
const POLICIES = {
  chat: { limit: 60, windowMs: HOUR_MS },
  contact: { limit: 5, windowMs: HOUR_MS },
  comments: { limit: 60, windowMs: HOUR_MS },
} as const

export async function checkEndpointLimit(request: Request, bucket: 'chat' | 'contact' | 'comments') {
  const env = getServerEnv()
  if (env.NODE_ENV === 'development') {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, retryAfterSeconds: 0 }
  }

  const production = env.NODE_ENV === 'production'
  const clientKey = await clientKeyFromRequest(
    request,
    requiredServerEnv('RATE_LIMIT_HASH_SECRET'),
    production,
    isVercelRuntime(),
  )
  const policy = POLICIES[bucket]
  return createRateLimiter(store, policy).check(bucket, clientKey)
}
