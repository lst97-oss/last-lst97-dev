import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "public_rate_limits" (
      "bucket" varchar(32) NOT NULL,
      "client_key" char(64) NOT NULL,
      "window_started_at" timestamptz NOT NULL,
      "request_count" integer NOT NULL,
      CONSTRAINT "public_rate_limits_bucket_client_window_pk" PRIMARY KEY ("bucket", "client_key", "window_started_at"),
      CONSTRAINT "public_rate_limits_request_count_positive" CHECK ("request_count" > 0)
    )
  `)
  await db.execute(sql`CREATE INDEX "public_rate_limits_window_started_at_idx" ON "public_rate_limits" USING btree ("window_started_at")`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "public_rate_limits"`)
}
