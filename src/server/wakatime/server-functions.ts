import { createServerFn } from '@tanstack/react-start'

import { publicServerFnCache } from '../http/server-fn-cache'
import { wakaTimeReader } from './runtime'

export const getWakaTimeSnapshotServerFn = createServerFn({ method: 'GET', strict: false })
  .middleware([publicServerFnCache])
  .handler(() => wakaTimeReader.getSnapshot())
