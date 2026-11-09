import { describe, expect, it } from 'bun:test'

import { PgDialect } from 'drizzle-orm/pg-core'

import { createChatContactApprovalStore } from '../../src/server/contact/chat/approval-store'
import type { SqlExecute } from '../../src/server/database/payload-execute'

const FIRST_APPROVAL = '9f0c8a52-3b1e-4d7a-9c1f-2a6b8e4d5c70'
const SECOND_APPROVAL = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d'

// A stand-in for the claims table: the INSERT behaves like ON CONFLICT DO NOTHING ... RETURNING.
function fakeClaimsTable() {
  const claimed = new Set<string>()
  const statements: string[] = []
  const execute: SqlExecute = async (query) => {
    const { sql, params } = new PgDialect().sqlToQuery(query)
    statements.push(sql)
    if (!sql.includes('INSERT INTO "chat_contact_approval_claims"')) return { rows: [] }
    const id = String(params[0])
    if (claimed.has(id)) return { rows: [] }
    claimed.add(id)
    return { rows: [{ approval_id: id }] }
  }
  return { execute, statements }
}

describe('chat contact approval store', () => {
  it('rejects a malformed approval id before touching the database', async () => {
    const { execute, statements } = fakeClaimsTable()
    await expect(createChatContactApprovalStore(execute).claim('not-a-uuid')).rejects.toThrow(
      'Invalid contact approval identifier',
    )
    expect(statements).toHaveLength(0)
  })

  it('lets an approval be claimed once, so a replay is refused', async () => {
    const { execute, statements } = fakeClaimsTable()
    const store = createChatContactApprovalStore(execute)

    await expect(store.claim(FIRST_APPROVAL)).resolves.toBe(true)
    await expect(store.claim(FIRST_APPROVAL)).resolves.toBe(false)
    expect(statements.some((text) => text.includes('ON CONFLICT ("approval_id") DO NOTHING'))).toBe(true)
  })

  it('runs the 48-hour cleanup once per hour, not on every claim', async () => {
    const { execute, statements } = fakeClaimsTable()
    const store = createChatContactApprovalStore(execute)

    await store.claim(FIRST_APPROVAL)
    await store.claim(SECOND_APPROVAL)
    expect(statements.filter((text) => text.startsWith('DELETE FROM "chat_contact_approval_claims"'))).toHaveLength(1)
  })
})
