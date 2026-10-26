import { HttpHeader, HttpStatus } from '@lst97-oss/last-httprism'
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
          const refused = commentsErrorResponse(
            HttpStatus.TOO_MANY_REQUESTS.code,
            'RATE_LIMITED',
            'Too many comment requests. Try again later.',
          )
          refused.headers.set(HttpHeader.RETRY_AFTER, String(limit.retryAfterSeconds))
          return refused
        }
        if (route.operation === 'create' && dependencies.checkBotRequest) {
          const verification = await dependencies.checkBotRequest()
          if (verification.isBot) {
            return commentsErrorResponse(
              HttpStatus.FORBIDDEN.code,
              'FORBIDDEN',
              'Comments are not available to automated clients',
            )
          }
        }
      }
      return await dependencies.forward(request)
    } catch {
      dependencies.logger.error('comments.proxy_failed', { operation: route?.operation ?? 'unmatched' })
      return commentsErrorResponse(
        HttpStatus.SERVICE_UNAVAILABLE.code,
        'COMMENTS_UNAVAILABLE',
        'Comments are temporarily unavailable',
      )
    }
  }
}
