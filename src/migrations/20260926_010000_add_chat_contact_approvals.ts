import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "chat_contact_approval_claims" (
      "approval_id" uuid PRIMARY KEY,
      "claimed_at" timestamptz NOT NULL DEFAULT now()
    )
  `)
  await db.execute(sql`CREATE INDEX "chat_contact_approval_claims_claimed_at_idx" ON "chat_contact_approval_claims" USING btree ("claimed_at")`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "chat_contact_approval_claims"`)
}
