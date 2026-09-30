import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Generated slugs are now optional: the admin auto-fills a slug from the title
 * (`src/collections/hooks/content-slug.ts`), and an existing document may have
 * none yet, so the `NOT NULL` constraint is dropped on the live table and the
 * version table for every editorial collection.
 *
 * Reconstructed from the snapshot delta between
 * `20260929_083219_20260929_content_detail.json` and
 * `20260930_054442_make_generated_slugs_optional.json`, which shows exactly
 * these eight `notNull: true -> false` changes and nothing else.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "changelogs" ALTER COLUMN "slug" DROP NOT NULL;
   ALTER TABLE "_changelogs_v" ALTER COLUMN "version_slug" DROP NOT NULL;
   ALTER TABLE "posts" ALTER COLUMN "slug" DROP NOT NULL;
   ALTER TABLE "_posts_v" ALTER COLUMN "version_slug" DROP NOT NULL;
   ALTER TABLE "projects" ALTER COLUMN "slug" DROP NOT NULL;
   ALTER TABLE "_projects_v" ALTER COLUMN "version_slug" DROP NOT NULL;
   ALTER TABLE "topics" ALTER COLUMN "slug" DROP NOT NULL;
   ALTER TABLE "_topics_v" ALTER COLUMN "version_slug" DROP NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // A null slug cannot satisfy NOT NULL, so backfill a stable placeholder from
  // the row id before restoring the constraint.
  await db.execute(sql`
   UPDATE "changelogs" SET "slug" = 'changelog-' || "id" WHERE "slug" IS NULL;
   UPDATE "_changelogs_v" SET "version_slug" = 'changelog-' || "id" WHERE "version_slug" IS NULL;
   UPDATE "posts" SET "slug" = 'post-' || "id" WHERE "slug" IS NULL;
   UPDATE "_posts_v" SET "version_slug" = 'post-' || "id" WHERE "version_slug" IS NULL;
   UPDATE "projects" SET "slug" = 'project-' || "id" WHERE "slug" IS NULL;
   UPDATE "_projects_v" SET "version_slug" = 'project-' || "id" WHERE "version_slug" IS NULL;
   UPDATE "topics" SET "slug" = 'topic-' || "id" WHERE "slug" IS NULL;
   UPDATE "_topics_v" SET "version_slug" = 'topic-' || "id" WHERE "version_slug" IS NULL;

   ALTER TABLE "changelogs" ALTER COLUMN "slug" SET NOT NULL;
   ALTER TABLE "_changelogs_v" ALTER COLUMN "version_slug" SET NOT NULL;
   ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;
   ALTER TABLE "_posts_v" ALTER COLUMN "version_slug" SET NOT NULL;
   ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;
   ALTER TABLE "_projects_v" ALTER COLUMN "version_slug" SET NOT NULL;
   ALTER TABLE "topics" ALTER COLUMN "slug" SET NOT NULL;
   ALTER TABLE "_topics_v" ALTER COLUMN "version_slug" SET NOT NULL;`)
}
