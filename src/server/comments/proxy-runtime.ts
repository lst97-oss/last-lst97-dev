import { getServerEnv, isVercelRuntime, requiredServerEnv } from '../env'
import { logger } from '../observability/logger'
import { checkBotRequest } from '../security/botid'
import { clientKeyFromRequest } from '../security/client-key'
import { checkEndpointLimit } from '../security/rate-limit-runtime'
import { commentsProxyConfig } from './config'
import { createCommentsProxyHandler } from './http-handler'
import { commentsErrorResponse, proxyCommentsRequest } from './proxy'
import { readSiteOrigin } from './public-url'

// The visitor's rate-limit identity, the same hashed client address the host's own limits use.
function visitorClientId(request: Request): Promise<string> {
  const env = getServerEnv()
  return clientKeyFromRequest(
    request,
    requiredServerEnv('RATE_LIMIT_HASH_SECRET'),
    env.NODE_ENV === 'production',
    isVercelRuntime(),
  )
}

export const commentsProxyHandler = createCommentsProxyHandler({
  logger,
  rateLimit: (request) => checkEndpointLimit(request, 'comments'),
  checkBotRequest: () => checkBotRequest(),
  forward: async (request) => {
    const upstream = commentsProxyConfig()
    const siteOrigin = readSiteOrigin()
    if (!upstream || !siteOrigin) {
      return commentsErrorResponse(503, 'COMMENTS_UNAVAILABLE', 'Comments are temporarily unavailable')
    }
    return proxyCommentsRequest(request, {
      upstream,
      siteOrigin: new URL(siteOrigin).origin,
      clientId: visitorClientId,
    })
  },
})
