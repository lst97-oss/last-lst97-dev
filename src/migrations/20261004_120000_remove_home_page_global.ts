import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Drops the `home-page` global and its versions table.
 *
 * The home page no longer has a CMS-picked featured note: the recent-notes
 * window reads the single `-updatedAt` list it already loads, so the editorial
 * pick and its lead card are gone rather than reimplemented as a heuristic.
 *
 * `down` recreates the exact shapes recorded in the previous snapshot
 * (`20261001_101754_add_project_tags_topics.json`), including Payload's
 * `version_`-prefixed columns and the original index and constraint names, so a
 * rollback restores the prior schema rather than an approximation. It is a
 * schema rollback and not a data restore: the picked post is not recoverable.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "home_page"`)
  await db.execute(sql`DROP TABLE IF EXISTS "_home_page_v"`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "home_page" (
      "id" serial PRIMARY KEY NOT NULL,
      "featured_post_id" integer,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    )
  `)
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "home_page_featured_post_idx" ON "home_page" USING btree ("featured_post_id")`,
  )
  await db.execute(
    sql`ALTER TABLE "home_page" ADD CONSTRAINT "home_page_featured_post_id_posts_id_fk" FOREIGN KEY ("featured_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action`,
  )

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "_home_page_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "version_featured_post_id" integer,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "_home_page_v_version_version_featured_post_idx" ON "_home_page_v" USING btree ("version_featured_post_id")`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at")`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at")`,
  )
  await db.execute(
    sql`ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_featured_post_id_posts_id_fk" FOREIGN KEY ("version_featured_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action`,
  )
}