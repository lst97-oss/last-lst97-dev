import type { ContactSubmissionResult } from './service'
import { jsonResponse, readJsonBody, requestIdFrom } from '../http/request'
import type { Logger } from '../observability/logger'

export interface ContactPostHandlerDependencies {
  submitContact(input: unknown, expectedHostname: string, requestId: string): Promise<ContactSubmissionResult>
  logger: Logger
  rateLimit(request: Request): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>
}

export function createContactPostHandler(dependencies: ContactPostHandlerDependencies) {
  return async function POST({ request }: { request: Request }): Promise<Response> {
    const requestId = requestIdFrom(request)

    try {
      const body = await readJsonBody(request, 16 * 1024)
      if (!body.ok) {
        const status = body.reason === 'too_large' ? 413 : 400
        return jsonResponse(requestId, { error: body.reason === 'too_large' ? 'Request is too large.' : 'Enter valid JSON.', requestId }, status)
      }
      const limit = await dependencies.rateLimit(request)
      if (!limit.allowed) {
        return jsonResponse(requestId, { error: 'Too many requests. Please try again later.', requestId }, 429, {
          'retry-after': String(limit.retryAfterSeconds),
        })
      }
      const hostname = new URL(request.url).hostname
      const result = await dependencies.submitContact(body.value, hostname, requestId)
      if (!result.ok) {
        if ('reason' in result && result.reason === 'moderation') {
          dependencies.logger.warn('contact.rejected', { requestId, reason: 'content_policy' })
          return jsonResponse(requestId, { error: 'This message could not be accepted. Please revise it and try again.', requestId }, 422)
        }
        if ('reason' in result && result.reason === 'moderation_unavailable') {
          dependencies.logger.error('contact.moderation_unavailable', { requestId })
          return jsonResponse(requestId, { error: 'Message screening is temporarily unavailable.', requestId }, 503)
        }
        if ('reason' in result && result.reason === 'turnstile') {
          dependencies.logger.warn('contact.turnstile_rejected', { requestId })
          return jsonResponse(requestId, { error: 'Complete the security check and try again.', requestId }, 403)
        }
        if ('issues' in result) {
          return jsonResponse(requestId, { error: 'Check the highlighted fields.', fields: result.issues, requestId }, 400)
        }
        throw new Error('Unexpected contact submission result')
      }

      dependencies.logger.info('contact.accepted', {
        requestId,
        suppressed: 'suppressed' in result,
        ...('receiptStatus' in result ? { receiptStatus: result.receiptStatus } : {}),
      })
      return jsonResponse(requestId, { accepted: true, requestId })
    } catch {
      dependencies.logger.error('contact.failed', {
        requestId,
        failureCategory: 'contact_delivery',
      })
      return jsonResponse(requestId, { error: 'Contact delivery is temporarily unavailable.', requestId }, 503)
    }
  }
}
