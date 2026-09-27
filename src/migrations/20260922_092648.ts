import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_project_status" AS ENUM('planned', 'in_progress', 'completed', 'archived');
  CREATE TYPE "public"."enum__projects_v_version_project_status" AS ENUM('planned', 'in_progress', 'completed', 'archived');
  ALTER TABLE "posts" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_image_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_image_id" integer;
  ALTER TABLE "projects" ADD COLUMN "role" varchar;
  ALTER TABLE "projects" ADD COLUMN "project_status" "enum_projects_project_status";
  ALTER TABLE "projects" ADD COLUMN "start_date" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "end_date" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "projects" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "projects" ADD COLUMN "seo_image_id" integer;
  ALTER TABLE "_projects_v" ADD COLUMN "version_role" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_project_status" "enum__projects_v_version_project_status";
  ALTER TABLE "_projects_v" ADD COLUMN "version_start_date" timestamp(3) with time zone;
  ALTER TABLE "_projects_v" ADD COLUMN "version_end_date" timestamp(3) with time zone;
  ALTER TABLE "_projects_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_projects_v" ADD COLUMN "version_seo_image_id" integer;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_seo_seo_image_idx" ON "posts" USING btree ("seo_image_id");
  CREATE INDEX "_posts_v_version_seo_version_seo_image_idx" ON "_posts_v" USING btree ("version_seo_image_id");
  CREATE INDEX "projects_seo_seo_image_idx" ON "projects" USING btree ("seo_image_id");
  CREATE INDEX "_projects_v_version_seo_version_seo_image_idx" ON "_projects_v" USING btree ("version_seo_image_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_seo_image_id_media_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_seo_image_id_media_id_fk";
  
  ALTER TABLE "projects" DROP CONSTRAINT "projects_seo_image_id_media_id_fk";
  
  ALTER TABLE "_projects_v" DROP CONSTRAINT "_projects_v_version_seo_image_id_media_id_fk";
  
  DROP INDEX "posts_seo_seo_image_idx";
  DROP INDEX "_posts_v_version_seo_version_seo_image_idx";
  DROP INDEX "projects_seo_seo_image_idx";
  DROP INDEX "_projects_v_version_seo_version_seo_image_idx";
  ALTER TABLE "posts" DROP COLUMN "seo_title";
  ALTER TABLE "posts" DROP COLUMN "seo_description";
  ALTER TABLE "posts" DROP COLUMN "seo_image_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_image_id";
  ALTER TABLE "projects" DROP COLUMN "role";
  ALTER TABLE "projects" DROP COLUMN "project_status";
  ALTER TABLE "projects" DROP COLUMN "start_date";
  ALTER TABLE "projects" DROP COLUMN "end_date";
  ALTER TABLE "projects" DROP COLUMN "seo_title";
  ALTER TABLE "projects" DROP COLUMN "seo_description";
  ALTER TABLE "projects" DROP COLUMN "seo_image_id";
  ALTER TABLE "_projects_v" DROP COLUMN "version_role";
  ALTER TABLE "_projects_v" DROP COLUMN "version_project_status";
  ALTER TABLE "_projects_v" DROP COLUMN "version_start_date";
  ALTER TABLE "_projects_v" DROP COLUMN "version_end_date";
  ALTER TABLE "_projects_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_projects_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_projects_v" DROP COLUMN "version_seo_image_id";
  DROP TYPE "public"."enum_projects_project_status";
  DROP TYPE "public"."enum__projects_v_version_project_status";`)
}
