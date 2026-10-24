import type { Logger } from '../observability/logger'
import type { BotVerification } from '../security/botid'
import { classifyCommentsRoute, commentsErrorResponse, commentsPathOf, isWriteOperation } from './proxy'

export interface CommentsProxyHandlerDependencies {
  // The forwarder, bound to the upstream config and the site origin.
  forward(request: Request): Promise<Response>
  rateLimit(request: Request): Promise<{ allowed: boolean; retryAfterSeconds: number }>
  checkBotRequest?(): Promise<BotVerification>
  logger: Logger
}

// Writes are limited per visitor before anything reaches the comments service.
// Reads are not limited here: they are public and the comments service serves
// them directly, so a rate limit would only slow page loads.
export function createCommentsProxyHandler(dependencies: CommentsProxyHandlerDependencies) {
  return async function handle({ request }: { request: Request }): Promise<Response> {
    const route = classifyCommentsRoute(request.method, commentsPathOf(request.url))
    try {
      if (route && isWriteOperation(route.operation)) {
        const limit = await dependencies.rateLimit(request)
        if (!limit.allowed) {
          const refused = commentsErrorResponse(429, 'RATE_LIMITED', 'Too many comment requests. Try again later.')
          refused.headers.set('retry-after', String(limit.retryAfterSeconds))
          return refused
        }
        if (route.operation === 'create' && dependencies.checkBotRequest) {
          const verification = await dependencies.checkBotRequest()
          if (verification.isBot) {
            return commentsErrorResponse(403, 'FORBIDDEN', 'Comments are not available to automated clients')
          }
        }
      }
      return await dependencies.forward(request)
    } catch {
      dependencies.logger.error('comments.proxy_failed', { operation: route?.operation ?? 'unmatched' })
      return commentsErrorResponse(503, 'COMMENTS_UNAVAILABLE', 'Comments are temporarily unavailable')
    }
  }
}
