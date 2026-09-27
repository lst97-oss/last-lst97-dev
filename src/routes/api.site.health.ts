import { createFileRoute } from '@tanstack/react-router'

import { createSiteHealthGetHandler } from '../server/site-health'

const GET = createSiteHealthGetHandler()

export const Route = createFileRoute('/api/site/health')({
  server: { handlers: { GET } },
})
