import { createFileRoute } from '@tanstack/react-router'
import { createChatPostHandler } from '../server/chat/http-handler'
import { getChatContactWorkflow, getChatService, verifyChatTurnstile } from '../server/chat/runtime'
import { getServerEnv } from '../server/env'
import { chatRequestMetadataFromRequest } from '../server/observability/chat-request-metadata'
import { logger } from '../server/observability/logger'
import { checkEndpointLimit } from '../server/security/rate-limit-runtime'

const POST = createChatPostHandler({
  send: (input) => getChatService().send(input),
  sendStream: (input, signal) => getChatService().sendStream(input, signal),
  verifyChatTurnstile,
  handleContactAction: (input) => getChatContactWorkflow().handle(input),
  streamMaxMs: () => getServerEnv().CHAT_STREAM_MAX_MS,
  logger,
  getDiagnosticsMetadata: (request) => {
    const env = getServerEnv()
    if (!env.CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL) return undefined
    return chatRequestMetadataFromRequest(request, {
      cloudflareOriginVerifySecret: env.NODE_ENV === 'production' ? env.CLOUDFLARE_ORIGIN_VERIFY_SECRET : undefined,
    })
  },
  rateLimit: (request) => checkEndpointLimit(request, 'chat'),
  contactRateLimit: (request) => checkEndpointLimit(request, 'contact'),
})

export const Route = createFileRoute('/api/site/chat')({
  server: { handlers: { POST } },
})
