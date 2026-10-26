import { payloadAdminIndexRoute } from '@payloadcms/tanstack-start/client'
import { createFileRoute } from '@tanstack/react-router'
import { payloadAdminPageServerFn } from '../lib/payload/server-fns'

export const Route = createFileRoute('/_payload/admin/')({
  // Admin state must never be reused from the router cache across saves or sessions.
  staleTime: 0,
  ...payloadAdminIndexRoute({
    load: ({ data }) => payloadAdminPageServerFn({ data: { splat: '', search: data.search } }),
  }),
})
