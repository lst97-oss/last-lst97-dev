import { describe, expect, it } from 'bun:test'

import { migrateKnowledgeDatabase } from '../../src/server/knowledge/database-migration'
import { sourceTypeSchema } from '../../src/server/knowledge/repository/shared'

describe('dedicated knowledge database migration', () => {
  it('creates pgvector and the private chunk index transactionally and idempotently', async () => {
    const statements: string[] = []
    await migrateKnowledgeDatabase({
      query: async (statement) => {
        statements.push(statement)
        return { rows: [] }
      },
    })

    expect(statements[0]).toBe('BEGIN')
    expect(statements[1]).toContain('CREATE EXTENSION IF NOT EXISTS vector')
    expect(statements[2]).toContain('CREATE TABLE IF NOT EXISTS "knowledge_chunks"')
    expect(statements[2]).toContain('"embedding" vector(1024) NOT NULL')
    expect(statements[2]).toContain("'github-private'")
    expect(statements[2]).toContain("'github-profile'")
    expect(
      statements.some((statement) =>
        statement.includes('CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw_idx"'),
      ),
    ).toBe(true)
    // The invariant is that every source type the zod enum admits is also
    // allowed by the DB CHECK in BOTH statements, so an existing database picks
    // up a new member on the next run. Hard-coding a member list here would let
    // the two drift apart silently until an insert hit a CHECK violation.
    const addConstraint = statements.find((statement) => statement.includes('ADD CONSTRAINT'))
    expect(addConstraint).toBeDefined()
    for (const sourceType of sourceTypeSchema.options) {
      expect(statements[2]).toContain(`'${sourceType}'`)
      expect(addConstraint).toContain(`'${sourceType}'`)
    }
    expect(statements.some((statement) => statement.includes('CREATE TABLE IF NOT EXISTS "knowledge_projects"'))).toBe(
      true,
    )
    expect(statements.some((statement) => statement.includes('knowledge_projects_kinds_gin_idx'))).toBe(true)
    expect(statements.at(-1)).toBe('COMMIT')
  })

  it('rolls back the dedicated database transaction when schema creation fails', async () => {
    const statements: string[] = []
    await expect(
      migrateKnowledgeDatabase({
        query: async (statement) => {
          statements.push(statement)
          if (statement.includes('CREATE TABLE')) throw new Error('raw connection detail')
          return { rows: [] }
        },
      }),
    ).rejects.toThrow('Knowledge database migration failed')

    expect(statements.at(-1)).toBe('ROLLBACK')
  })
})
