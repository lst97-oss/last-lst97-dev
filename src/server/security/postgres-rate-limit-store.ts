import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import type { RateLimitStore } from './rate-limit'

let payloadPromise: ReturnType<typeof getPayload> | undefined
let lastCleanupAt = 0

async function getPayloadInstance() {
  payloadPromise ??= getPayload({ config: configPromise })
  return payloadPromise
}

export function createPostgresRateLimitStore(): RateLimitStore {
  return {
    async consume(bucket, clientKey, windowStartedAt) {
      const payload = await getPayloadInstance()
      const drizzle = payload.db.drizzle
      if (Date.now() - lastCleanupAt > 60 * 60 * 1_000) {
        await drizzle.execute(sql`DELETE FROM "public_rate_limits" WHERE "window_started_at" < now() - interval '48 hours'`)
        lastCleanupAt = Date.now()
      }
      const result = await drizzle.execute(sql`
        INSERT INTO "public_rate_limits" ("bucket", "client_key", "window_started_at", "request_count")
        VALUES (${bucket}, ${clientKey}, to_timestamp(${windowStartedAt} / 1000.0), 1)
        ON CONFLICT ("bucket", "client_key", "window_started_at") DO UPDATE SET
          "request_count" = "public_rate_limits"."request_count" + 1
        RETURNING "request_count"
      `) as { rows?: Array<{ request_count: number | string }> }
      const count = Number(result.rows?.[0]?.request_count)
      if (!Number.isSafeInteger(count) || count < 1) throw new Error('Rate limit store returned an invalid count')
      return count
    },
  }
}
