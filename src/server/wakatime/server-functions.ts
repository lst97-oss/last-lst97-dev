import { createServerFn } from '@tanstack/react-start'

import { wakaTimeReader } from './runtime'

export const getWakaTimeSnapshotServerFn = createServerFn({ method: 'GET', strict: false })
  .handler(() => wakaTimeReader.getSnapshot())
