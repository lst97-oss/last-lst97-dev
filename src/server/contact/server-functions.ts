import { createServerFn } from '@tanstack/react-start'

import { getServerEnv } from '../env'
import { publicServerFnCache } from '../http/server-fn-cache'

export const getTurnstileSiteKeyServerFn = createServerFn({ method: 'GET', strict: false })
  .middleware([publicServerFnCache])
  .handler(() => getServerEnv().TURNSTILE_SITE_KEY ?? null)
