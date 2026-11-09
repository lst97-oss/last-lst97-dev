import { sql } from '@payloadcms/db-postgres'

import { executePayloadSql, type SqlExecute } from '../database/payload-execute'
import type { RateLimitStore } from './rate-limit'

export function createPostgresRateLimitStore(execute: SqlExecute = executePayloadSql): RateLimitStore {
  let lastCleanupAt = 0

  return {
    async consume(bucket, clientKey, windowStartedAt) {
      if (Date.now() - lastCleanupAt > 60 * 60 * 1_000) {
        await execute(sql`DELETE FROM "public_rate_limits" WHERE "window_started_at" < now() - interval '48 hours'`)
        lastCleanupAt = Date.now()
      }
      const result = await execute(sql`
        INSERT INTO "public_rate_limits" ("bucket", "client_key", "window_started_at", "request_count")
        VALUES (${bucket}, ${clientKey}, to_timestamp(${windowStartedAt} / 1000.0), 1)
        ON CONFLICT ("bucket", "client_key", "window_started_at") DO UPDATE SET
          "request_count" = "public_rate_limits"."request_count" + 1
        RETURNING "request_count"
      `)
      const count = Number(result.rows?.[0]?.request_count)
      if (!Number.isSafeInteger(count) || count < 1) throw new Error('Rate limit store returned an invalid count')
      return count
    },
  }
}
