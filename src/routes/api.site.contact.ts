import { createFileRoute } from '@tanstack/react-router'

import { createContactPostHandler } from '../server/contact/http-handler'
import { submitContact } from '../server/contact/runtime'
import { logger } from '../server/observability/logger'
import { checkEndpointLimit } from '../server/security/rate-limit-runtime'

const POST = createContactPostHandler({
  submitContact,
  logger,
  rateLimit: (request) => checkEndpointLimit(request, 'contact'),
})

export const Route = createFileRoute('/api/site/contact')({
  server: { handlers: { POST } },
})
