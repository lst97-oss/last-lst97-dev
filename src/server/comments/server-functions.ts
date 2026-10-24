import { createServerFn } from '@tanstack/react-start'

import { publicServerFnCache } from '../http/server-fn-cache'
import { type CommentsPublicConfig, commentsPublicConfig } from './config'

// Secret-free settings the comments widget needs on a detail page. The API key
// never leaves the server; this returns the site key, the API origin and the
// public Turnstile key only.
export const getCommentsConfigServerFn = createServerFn({ method: 'GET', strict: false })
  .middleware([publicServerFnCache])
  .handler((): CommentsPublicConfig | null => commentsPublicConfig())
