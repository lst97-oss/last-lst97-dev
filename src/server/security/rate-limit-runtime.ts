import { getServerEnv, isVercelRuntime, requiredServerEnv } from '../env'
import { clientKeyFromRequest } from './client-key'
import { createPostgresRateLimitStore } from './postgres-rate-limit-store'
import { createRateLimiter } from './rate-limit'

const store = createPostgresRateLimitStore()

export async function checkEndpointLimit(request: Request, bucket: 'chat' | 'contact') {
  const env = getServerEnv()
  const production = env.NODE_ENV === 'production'
  const clientKey = await clientKeyFromRequest(
    request,
    requiredServerEnv('RATE_LIMIT_HASH_SECRET'),
    production,
    isVercelRuntime(),
  )
  const policy = bucket === 'chat' ? { limit: 60, windowMs: 60 * 60 * 1_000 } : { limit: 5, windowMs: 60 * 60 * 1_000 }
  return createRateLimiter(store, policy).check(bucket, clientKey)
}
