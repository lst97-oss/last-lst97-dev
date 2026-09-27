import { createServerFn } from '@tanstack/react-start'

import { getServerEnv } from '../env'

export const getTurnstileSiteKeyServerFn = createServerFn({ method: 'GET', strict: false })
  .handler(() => getServerEnv().TURNSTILE_SITE_KEY ?? null)
