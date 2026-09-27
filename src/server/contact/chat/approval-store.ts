import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

export interface ChatContactApprovalStore {
  claim(approvalId: string): Promise<boolean>
}

export function createChatContactApprovalStore(): ChatContactApprovalStore {
  let payloadPromise: ReturnType<typeof getPayload> | undefined
  let lastCleanupAt = 0

  async function getPayloadInstance() {
    payloadPromise ??= getPayload({ config: configPromise })
    return payloadPromise
  }

  return {
    async claim(approvalId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(approvalId)) {
        throw new Error('Invalid contact approval identifier')
      }
      const payload = await getPayloadInstance()
      const drizzle = payload.db.drizzle
      if (Date.now() - lastCleanupAt > 60 * 60 * 1_000) {
        await drizzle.execute(
          sql`DELETE FROM "chat_contact_approval_claims" WHERE "claimed_at" < now() - interval '48 hours'`,
        )
        lastCleanupAt = Date.now()
      }
      const result = (await drizzle.execute(sql`
        INSERT INTO "chat_contact_approval_claims" ("approval_id")
        VALUES (${approvalId}::uuid)
        ON CONFLICT ("approval_id") DO NOTHING
        RETURNING "approval_id"
      `)) as { rows?: Array<{ approval_id: string }> }
      return Array.isArray(result.rows) && result.rows.length === 1
    },
  }
}
