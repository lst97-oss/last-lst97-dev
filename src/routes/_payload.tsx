import { createServerFunctionClient, payloadLayoutRoute } from '@payloadcms/tanstack-start/client'
import { createFileRoute } from '@tanstack/react-router'
import payloadAdminCss from '@/styles/payload-admin.css?url'
import { payloadLayoutServerFn, payloadServerFn } from '../lib/payload/server-fns'

const serverFunction = createServerFunctionClient({
  runServerFn: ({ data }) => payloadServerFn({ data }),
})

export const Route = createFileRoute('/_payload')({
  // Admin state must never be reused from the router cache across saves or sessions.
  staleTime: 0,
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'stylesheet', href: payloadAdminCss }],
  }),
  ...payloadLayoutRoute({ load: payloadLayoutServerFn, serverFunction }),
})
