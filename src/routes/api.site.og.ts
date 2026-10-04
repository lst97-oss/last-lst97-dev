import { createFileRoute } from '@tanstack/react-router'
import { createOpenGraphImageGetHandler } from '@/server/seo/open-graph-image'

const GET = createOpenGraphImageGetHandler()

export const Route = createFileRoute('/api/site/og')({
  server: { handlers: { GET } },
})
