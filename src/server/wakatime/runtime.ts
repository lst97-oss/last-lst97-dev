import { logger } from '../observability/logger'
import { createWakaTimeReader } from './service'

export const wakaTimeReader = createWakaTimeReader({
  endpoint: 'https://wakatime.com/share/@lst97/93993eb7-ae0d-41d1-b44d-6bcf2f02ceb0.json',
  logger,
})
