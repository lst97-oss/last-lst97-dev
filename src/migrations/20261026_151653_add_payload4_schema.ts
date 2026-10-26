import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payload_llm_instructions_entity_type" AS ENUM('collection', 'global');
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_users_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "media_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_media_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "changelogs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_changelogs_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "topics_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_topics_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "tags_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_tags_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_llm_instructions" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"entity_slug" varchar NOT NULL,
  	"entity_type" "enum_payload_llm_instructions_entity_type" NOT NULL,
  	"additional_instructions" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  ALTER TABLE "media" ADD COLUMN "original_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "original_url" varchar;
  ALTER TABLE "media" ADD COLUMN "original_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "original_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "original_width" numeric;
  ALTER TABLE "media" ADD COLUMN "original_height" numeric;
  ALTER TABLE "media" ADD COLUMN "original_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "original__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_thumbnail_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_thumbnail__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_card_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_card__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_hero_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_hero__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_gallery_sm_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_gallery_sm__objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_gallery_lg_prefix" varchar;
  ALTER TABLE "media" ADD COLUMN "variants_gallery_lg__objectkey" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_original_prefix" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_original__objectkey" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_thumbnail_prefix" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_thumbnail__objectkey" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_card_prefix" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_card__objectkey" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_hero_prefix" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_hero__objectkey" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_gallery_sm_prefix" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_gallery_sm__objectkey" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_gallery_lg_prefix" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_variants_gallery_lg__objectkey" varchar;
  ALTER TABLE "posts_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "projects_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "_projects_v_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_users_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_media_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "changelogs_rels" ADD CONSTRAINT "changelogs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "changelogs_rels" ADD CONSTRAINT "changelogs_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_changelogs_v_rels" ADD CONSTRAINT "_changelogs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_changelogs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_changelogs_v_rels" ADD CONSTRAINT "_changelogs_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "topics_rels" ADD CONSTRAINT "topics_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "topics_rels" ADD CONSTRAINT "topics_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_topics_v_rels" ADD CONSTRAINT "_topics_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_topics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_topics_v_rels" ADD CONSTRAINT "_topics_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tags_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_llm_instructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_users_id_idx" ON "users_rels" USING btree ("users_id");
  CREATE INDEX "_users_v_rels_order_idx" ON "_users_v_rels" USING btree ("order");
  CREATE INDEX "_users_v_rels_parent_idx" ON "_users_v_rels" USING btree ("parent_id");
  CREATE INDEX "_users_v_rels_path_idx" ON "_users_v_rels" USING btree ("path");
  CREATE INDEX "_users_v_rels_users_id_idx" ON "_users_v_rels" USING btree ("users_id");
  CREATE INDEX "media_rels_order_idx" ON "media_rels" USING btree ("order");
  CREATE INDEX "media_rels_parent_idx" ON "media_rels" USING btree ("parent_id");
  CREATE INDEX "media_rels_path_idx" ON "media_rels" USING btree ("path");
  CREATE INDEX "media_rels_users_id_idx" ON "media_rels" USING btree ("users_id");
  CREATE INDEX "_media_v_rels_order_idx" ON "_media_v_rels" USING btree ("order");
  CREATE INDEX "_media_v_rels_parent_idx" ON "_media_v_rels" USING btree ("parent_id");
  CREATE INDEX "_media_v_rels_path_idx" ON "_media_v_rels" USING btree ("path");
  CREATE INDEX "_media_v_rels_users_id_idx" ON "_media_v_rels" USING btree ("users_id");
  CREATE INDEX "changelogs_rels_order_idx" ON "changelogs_rels" USING btree ("order");
  CREATE INDEX "changelogs_rels_parent_idx" ON "changelogs_rels" USING btree ("parent_id");
  CREATE INDEX "changelogs_rels_path_idx" ON "changelogs_rels" USING btree ("path");
  CREATE INDEX "changelogs_rels_users_id_idx" ON "changelogs_rels" USING btree ("users_id");
  CREATE INDEX "_changelogs_v_rels_order_idx" ON "_changelogs_v_rels" USING btree ("order");
  CREATE INDEX "_changelogs_v_rels_parent_idx" ON "_changelogs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_changelogs_v_rels_path_idx" ON "_changelogs_v_rels" USING btree ("path");
  CREATE INDEX "_changelogs_v_rels_users_id_idx" ON "_changelogs_v_rels" USING btree ("users_id");
  CREATE INDEX "topics_rels_order_idx" ON "topics_rels" USING btree ("order");
  CREATE INDEX "topics_rels_parent_idx" ON "topics_rels" USING btree ("parent_id");
  CREATE INDEX "topics_rels_path_idx" ON "topics_rels" USING btree ("path");
  CREATE INDEX "topics_rels_users_id_idx" ON "topics_rels" USING btree ("users_id");
  CREATE INDEX "_topics_v_rels_order_idx" ON "_topics_v_rels" USING btree ("order");
  CREATE INDEX "_topics_v_rels_parent_idx" ON "_topics_v_rels" USING btree ("parent_id");
  CREATE INDEX "_topics_v_rels_path_idx" ON "_topics_v_rels" USING btree ("path");
  CREATE INDEX "_topics_v_rels_users_id_idx" ON "_topics_v_rels" USING btree ("users_id");
  CREATE INDEX "tags_rels_order_idx" ON "tags_rels" USING btree ("order");
  CREATE INDEX "tags_rels_parent_idx" ON "tags_rels" USING btree ("parent_id");
  CREATE INDEX "tags_rels_path_idx" ON "tags_rels" USING btree ("path");
  CREATE INDEX "tags_rels_users_id_idx" ON "tags_rels" USING btree ("users_id");
  CREATE INDEX "_tags_v_rels_order_idx" ON "_tags_v_rels" USING btree ("order");
  CREATE INDEX "_tags_v_rels_parent_idx" ON "_tags_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tags_v_rels_path_idx" ON "_tags_v_rels" USING btree ("path");
  CREATE INDEX "_tags_v_rels_users_id_idx" ON "_tags_v_rels" USING btree ("users_id");
  CREATE INDEX "payload_llm_instructions_entity_slug_idx" ON "payload_llm_instructions" USING btree ("entity_slug");
  CREATE INDEX "payload_llm_instructions_updated_at_idx" ON "payload_llm_instructions" USING btree ("updated_at");
  CREATE INDEX "payload_llm_instructions_created_at_idx" ON "payload_llm_instructions" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_rels_order_idx" ON "payload_llm_instructions_rels" USING btree ("order");
  CREATE INDEX "payload_llm_instructions_rels_parent_idx" ON "payload_llm_instructions_rels" USING btree ("parent_id");
  CREATE INDEX "payload_llm_instructions_rels_path_idx" ON "payload_llm_instructions_rels" USING btree ("path");
  CREATE INDEX "payload_llm_instructions_rels_users_id_idx" ON "payload_llm_instructions_rels" USING btree ("users_id");
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_original_original_filename_idx" ON "media" USING btree ("original_filename");
  CREATE INDEX "_media_v_version_original_version_original_filename_idx" ON "_media_v" USING btree ("version_original_filename");
  CREATE INDEX "posts_rels_users_id_idx" ON "posts_rels" USING btree ("users_id");
  CREATE INDEX "_posts_v_rels_users_id_idx" ON "_posts_v_rels" USING btree ("users_id");
  CREATE INDEX "projects_rels_users_id_idx" ON "projects_rels" USING btree ("users_id");
  CREATE INDEX "_projects_v_rels_users_id_idx" ON "_projects_v_rels" USING btree ("users_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_users_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_media_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "changelogs_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_changelogs_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "topics_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_topics_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tags_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tags_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_llm_instructions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_llm_instructions_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "_users_v_rels" CASCADE;
  DROP TABLE "media_rels" CASCADE;
  DROP TABLE "_media_v_rels" CASCADE;
  DROP TABLE "changelogs_rels" CASCADE;
  DROP TABLE "_changelogs_v_rels" CASCADE;
  DROP TABLE "topics_rels" CASCADE;
  DROP TABLE "_topics_v_rels" CASCADE;
  DROP TABLE "tags_rels" CASCADE;
  DROP TABLE "_tags_v_rels" CASCADE;
  DROP TABLE "payload_llm_instructions" CASCADE;
  DROP TABLE "payload_llm_instructions_rels" CASCADE;
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_users_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_users_fk";
  
  ALTER TABLE "projects_rels" DROP CONSTRAINT "projects_rels_users_fk";
  
  ALTER TABLE "_projects_v_rels" DROP CONSTRAINT "_projects_v_rels_users_fk";
  
  DROP INDEX "media_original_original_filename_idx";
  DROP INDEX "_media_v_version_original_version_original_filename_idx";
  DROP INDEX "posts_rels_users_id_idx";
  DROP INDEX "_posts_v_rels_users_id_idx";
  DROP INDEX "projects_rels_users_id_idx";
  DROP INDEX "_projects_v_rels_users_id_idx";
  ALTER TABLE "media" DROP COLUMN "original_filename";
  ALTER TABLE "media" DROP COLUMN "original_url";
  ALTER TABLE "media" DROP COLUMN "original_mime_type";
  ALTER TABLE "media" DROP COLUMN "original_filesize";
  ALTER TABLE "media" DROP COLUMN "original_width";
  ALTER TABLE "media" DROP COLUMN "original_height";
  ALTER TABLE "media" DROP COLUMN "original_prefix";
  ALTER TABLE "media" DROP COLUMN "original__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_thumbnail_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_thumbnail__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_card_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_card__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_hero_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_hero__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_gallery_sm_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_gallery_sm__objectkey";
  ALTER TABLE "media" DROP COLUMN "variants_gallery_lg_prefix";
  ALTER TABLE "media" DROP COLUMN "variants_gallery_lg__objectkey";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_original_prefix";
  ALTER TABLE "_media_v" DROP COLUMN "version_original__objectkey";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_thumbnail_prefix";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_thumbnail__objectkey";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_card_prefix";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_card__objectkey";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_hero_prefix";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_hero__objectkey";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_gallery_sm_prefix";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_gallery_sm__objectkey";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_gallery_lg_prefix";
  ALTER TABLE "_media_v" DROP COLUMN "version_variants_gallery_lg__objectkey";
  ALTER TABLE "posts_rels" DROP COLUMN "users_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "users_id";
  ALTER TABLE "projects_rels" DROP COLUMN "users_id";
  ALTER TABLE "_projects_v_rels" DROP COLUMN "users_id";
  DROP TYPE "public"."enum_payload_llm_instructions_entity_type";`)
}
