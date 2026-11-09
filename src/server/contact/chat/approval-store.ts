import { sql } from '@payloadcms/db-postgres'

import { executePayloadSql, type SqlExecute } from '../../database/payload-execute'

export interface ChatContactApprovalStore {
  claim(approvalId: string): Promise<boolean>
}

// Claims are kept 48 hours, longer than the 24-hour approval lifetime, so a used approval cannot be replayed.
export function createChatContactApprovalStore(execute: SqlExecute = executePayloadSql): ChatContactApprovalStore {
  let lastCleanupAt = 0

  return {
    async claim(approvalId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(approvalId)) {
        throw new Error('Invalid contact approval identifier')
      }
      if (Date.now() - lastCleanupAt > 60 * 60 * 1_000) {
        await execute(sql`DELETE FROM "chat_contact_approval_claims" WHERE "claimed_at" < now() - interval '48 hours'`)
        lastCleanupAt = Date.now()
      }
      const result = await execute(sql`
        INSERT INTO "chat_contact_approval_claims" ("approval_id")
        VALUES (${approvalId}::uuid)
        ON CONFLICT ("approval_id") DO NOTHING
        RETURNING "approval_id"
      `)
      return Array.isArray(result.rows) && result.rows.length === 1
    },
  }
}
