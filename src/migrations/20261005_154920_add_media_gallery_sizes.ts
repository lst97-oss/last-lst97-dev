import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "sizes_gallery_sm_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_sm_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_sm_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_sm_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_sm_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_sm_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_lg_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_lg_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_lg_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_lg_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_lg_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_lg_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_sm_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_sm_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_sm_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_sm_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_sm_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_sm_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_lg_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_lg_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_lg_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_lg_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_lg_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_gallery_lg_filename" varchar;
  CREATE INDEX "media_sizes_gallery_sm_sizes_gallery_sm_filename_idx" ON "media" USING btree ("sizes_gallery_sm_filename");
  CREATE INDEX "media_sizes_gallery_lg_sizes_gallery_lg_filename_idx" ON "media" USING btree ("sizes_gallery_lg_filename");
  CREATE INDEX "_media_v_version_sizes_gallery_sm_version_sizes_gallery__idx" ON "_media_v" USING btree ("version_sizes_gallery_sm_filename");
  CREATE INDEX "_media_v_version_sizes_gallery_lg_version_sizes_gallery__idx" ON "_media_v" USING btree ("version_sizes_gallery_lg_filename");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_gallery_sm_sizes_gallery_sm_filename_idx";
  DROP INDEX "media_sizes_gallery_lg_sizes_gallery_lg_filename_idx";
  DROP INDEX "_media_v_version_sizes_gallery_sm_version_sizes_gallery__idx";
  DROP INDEX "_media_v_version_sizes_gallery_lg_version_sizes_gallery__idx";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_sm_url";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_sm_width";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_sm_height";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_sm_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_sm_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_sm_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_lg_url";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_lg_width";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_lg_height";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_lg_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_lg_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_lg_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_sm_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_sm_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_sm_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_sm_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_sm_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_sm_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_lg_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_lg_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_lg_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_lg_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_lg_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_gallery_lg_filename";`)
}
