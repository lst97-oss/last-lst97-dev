import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_changelogs_change_types" AS ENUM('feature', 'improvement', 'bug_fix', 'security', 'breaking_change', 'maintenance', 'documentation');
  CREATE TYPE "public"."enum__changelogs_v_version_change_types" AS ENUM('feature', 'improvement', 'bug_fix', 'security', 'breaking_change', 'maintenance', 'documentation');
  CREATE TABLE "changelogs_change_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_changelogs_change_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_changelogs_v_version_change_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__changelogs_v_version_change_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "projects_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "_projects_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_topics_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"featured_post_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_home_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_featured_post_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumbnail_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumbnail_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumbnail_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumbnail_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumbnail_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumbnail_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_hero_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_hero_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_hero_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_hero_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_hero_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_hero_filename" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "topics_id" integer;
  ALTER TABLE "changelogs_change_types" ADD CONSTRAINT "changelogs_change_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_changelogs_v_version_change_types" ADD CONSTRAINT "_changelogs_v_version_change_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_changelogs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_gallery" ADD CONSTRAINT "projects_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_gallery" ADD CONSTRAINT "projects_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_gallery" ADD CONSTRAINT "_projects_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_gallery" ADD CONSTRAINT "_projects_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_topics_v" ADD CONSTRAINT "_topics_v_parent_id_topics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_featured_post_id_posts_id_fk" FOREIGN KEY ("featured_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_featured_post_id_posts_id_fk" FOREIGN KEY ("version_featured_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "changelogs_change_types_order_idx" ON "changelogs_change_types" USING btree ("order");
  CREATE INDEX "changelogs_change_types_parent_idx" ON "changelogs_change_types" USING btree ("parent_id");
  CREATE INDEX "_changelogs_v_version_change_types_order_idx" ON "_changelogs_v_version_change_types" USING btree ("order");
  CREATE INDEX "_changelogs_v_version_change_types_parent_idx" ON "_changelogs_v_version_change_types" USING btree ("parent_id");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_topics_id_idx" ON "posts_rels" USING btree ("topics_id");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_topics_id_idx" ON "_posts_v_rels" USING btree ("topics_id");
  CREATE INDEX "projects_gallery_order_idx" ON "projects_gallery" USING btree ("_order");
  CREATE INDEX "projects_gallery_parent_id_idx" ON "projects_gallery" USING btree ("_parent_id");
  CREATE INDEX "projects_gallery_image_idx" ON "projects_gallery" USING btree ("image_id");
  CREATE INDEX "_projects_v_version_gallery_order_idx" ON "_projects_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_projects_v_version_gallery_parent_id_idx" ON "_projects_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_gallery_image_idx" ON "_projects_v_version_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");
  CREATE INDEX "topics_updated_at_idx" ON "topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "topics" USING btree ("created_at");
  CREATE INDEX "_topics_v_parent_idx" ON "_topics_v" USING btree ("parent_id");
  CREATE INDEX "_topics_v_version_version_slug_idx" ON "_topics_v" USING btree ("version_slug");
  CREATE INDEX "_topics_v_version_version_updated_at_idx" ON "_topics_v" USING btree ("version_updated_at");
  CREATE INDEX "_topics_v_version_version_created_at_idx" ON "_topics_v" USING btree ("version_created_at");
  CREATE INDEX "_topics_v_created_at_idx" ON "_topics_v" USING btree ("created_at");
  CREATE INDEX "_topics_v_updated_at_idx" ON "_topics_v" USING btree ("updated_at");
  CREATE INDEX "home_page_featured_post_idx" ON "home_page" USING btree ("featured_post_id");
  CREATE INDEX "_home_page_v_version_version_featured_post_idx" ON "_home_page_v" USING btree ("version_featured_post_id");
  CREATE INDEX "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "_media_v_version_sizes_thumbnail_version_sizes_thumbnail_idx" ON "_media_v" USING btree ("version_sizes_thumbnail_filename");
  CREATE INDEX "_media_v_version_sizes_card_version_sizes_card_filename_idx" ON "_media_v" USING btree ("version_sizes_card_filename");
  CREATE INDEX "_media_v_version_sizes_hero_version_sizes_hero_filename_idx" ON "_media_v" USING btree ("version_sizes_hero_filename");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("topics_id");
  INSERT INTO "home_page" ("featured_post_id", "updated_at", "created_at")
    SELECT "id", now(), now() FROM "posts"
    WHERE "featured" = true AND "status" = 'published' AND "published_at" <= now()
    ORDER BY "published_at" DESC, "id" DESC LIMIT 1;
  ALTER TABLE "posts" DROP COLUMN "featured";
  ALTER TABLE "_posts_v" DROP COLUMN "version_featured";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "posts" ADD COLUMN "featured" boolean DEFAULT false;
  UPDATE "posts" SET "featured" = true
    WHERE "id" = (SELECT "featured_post_id" FROM "home_page" LIMIT 1);
   ALTER TABLE "changelogs_change_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_changelogs_v_version_change_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_projects_v_version_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "topics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_topics_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_page_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "changelogs_change_types" CASCADE;
  DROP TABLE "_changelogs_v_version_change_types" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "projects_gallery" CASCADE;
  DROP TABLE "_projects_v_version_gallery" CASCADE;
  DROP TABLE "topics" CASCADE;
  DROP TABLE "_topics_v" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_topics_fk";
  
  DROP INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx";
  DROP INDEX "media_sizes_card_sizes_card_filename_idx";
  DROP INDEX "media_sizes_hero_sizes_hero_filename_idx";
  DROP INDEX "_media_v_version_sizes_thumbnail_version_sizes_thumbnail_idx";
  DROP INDEX "_media_v_version_sizes_card_version_sizes_card_filename_idx";
  DROP INDEX "_media_v_version_sizes_hero_version_sizes_hero_filename_idx";
  DROP INDEX "payload_locked_documents_rels_topics_id_idx";
  ALTER TABLE "_posts_v" ADD COLUMN "version_featured" boolean DEFAULT false;
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_card_url";
  ALTER TABLE "media" DROP COLUMN "sizes_card_width";
  ALTER TABLE "media" DROP COLUMN "sizes_card_height";
  ALTER TABLE "media" DROP COLUMN "sizes_card_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_card_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_card_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumbnail_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumbnail_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumbnail_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumbnail_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumbnail_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumbnail_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_hero_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_hero_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_hero_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_hero_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_hero_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_hero_filename";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "topics_id";
  DROP TYPE "public"."enum_changelogs_change_types";
  DROP TYPE "public"."enum__changelogs_v_version_change_types";`)
}
