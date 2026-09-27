import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_changelogs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__changelogs_v_version_status" AS ENUM('draft', 'published');
  DO $$ BEGIN CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexKnowledgeSource', 'syncKnowledgeSources'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_payload_jobs_log_parent_task_slug" AS ENUM('inline', 'indexKnowledgeSource', 'syncKnowledgeSources'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexKnowledgeSource', 'syncKnowledgeSources'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE TABLE "changelogs_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );

  CREATE TABLE "changelogs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"version" varchar,
  	"excerpt" varchar NOT NULL,
  	"cover_image_id" integer,
  	"content" jsonb NOT NULL,
  	"status" "enum_changelogs_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"featured" boolean DEFAULT false,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "_changelogs_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL,
  	"_uuid" varchar
  );

  CREATE TABLE "_changelogs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_version" varchar,
  	"version_excerpt" varchar NOT NULL,
  	"version_cover_image_id" integer,
  	"version_content" jsonb NOT NULL,
  	"version_status" "enum__changelogs_v_version_status" DEFAULT 'draft' NOT NULL,
  	"version_published_at" timestamp(3) with time zone,
  	"version_featured" boolean DEFAULT false,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb NOT NULL,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb,
  	"parent_task_slug" "enum_payload_jobs_log_parent_task_slug",
  	"parent_task_i_d" varchar
  );

  CREATE TABLE IF NOT EXISTS "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"meta" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing_until" timestamp(3) with time zone,
  	"processing_token" varchar,
  	"concurrency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "changelogs_id" integer;
  ALTER TABLE "changelogs_tags" ADD CONSTRAINT "changelogs_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_changelogs_v_version_tags" ADD CONSTRAINT "_changelogs_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_changelogs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_changelogs_v" ADD CONSTRAINT "_changelogs_v_parent_id_changelogs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."changelogs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_changelogs_v" ADD CONSTRAINT "_changelogs_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_changelogs_v" ADD CONSTRAINT "_changelogs_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  DO $$ BEGIN ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX "changelogs_tags_order_idx" ON "changelogs_tags" USING btree ("_order");
  CREATE INDEX "changelogs_tags_parent_id_idx" ON "changelogs_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "changelogs_slug_idx" ON "changelogs" USING btree ("slug");
  CREATE INDEX "changelogs_version_idx" ON "changelogs" USING btree ("version");
  CREATE INDEX "changelogs_cover_image_idx" ON "changelogs" USING btree ("cover_image_id");
  CREATE INDEX "changelogs_status_idx" ON "changelogs" USING btree ("status");
  CREATE INDEX "changelogs_published_at_idx" ON "changelogs" USING btree ("published_at");
  CREATE INDEX "changelogs_seo_seo_image_idx" ON "changelogs" USING btree ("seo_image_id");
  CREATE INDEX "changelogs_updated_at_idx" ON "changelogs" USING btree ("updated_at");
  CREATE INDEX "changelogs_created_at_idx" ON "changelogs" USING btree ("created_at");
  CREATE INDEX "_changelogs_v_version_tags_order_idx" ON "_changelogs_v_version_tags" USING btree ("_order");
  CREATE INDEX "_changelogs_v_version_tags_parent_id_idx" ON "_changelogs_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_changelogs_v_parent_idx" ON "_changelogs_v" USING btree ("parent_id");
  CREATE INDEX "_changelogs_v_version_version_slug_idx" ON "_changelogs_v" USING btree ("version_slug");
  CREATE INDEX "_changelogs_v_version_version_version_idx" ON "_changelogs_v" USING btree ("version_version");
  CREATE INDEX "_changelogs_v_version_version_cover_image_idx" ON "_changelogs_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_changelogs_v_version_version_status_idx" ON "_changelogs_v" USING btree ("version_status");
  CREATE INDEX "_changelogs_v_version_version_published_at_idx" ON "_changelogs_v" USING btree ("version_published_at");
  CREATE INDEX "_changelogs_v_version_seo_version_seo_image_idx" ON "_changelogs_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_changelogs_v_version_version_updated_at_idx" ON "_changelogs_v" USING btree ("version_updated_at");
  CREATE INDEX "_changelogs_v_version_version_created_at_idx" ON "_changelogs_v" USING btree ("version_created_at");
  CREATE INDEX "_changelogs_v_created_at_idx" ON "_changelogs_v" USING btree ("created_at");
  CREATE INDEX "_changelogs_v_updated_at_idx" ON "_changelogs_v" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX IF NOT EXISTS "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX IF NOT EXISTS "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX IF NOT EXISTS "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX IF NOT EXISTS "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX IF NOT EXISTS "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX IF NOT EXISTS "payload_jobs_processing_until_idx" ON "payload_jobs" USING btree ("processing_until");
  CREATE INDEX IF NOT EXISTS "payload_jobs_concurrency_key_idx" ON "payload_jobs" USING btree ("concurrency_key");
  CREATE INDEX IF NOT EXISTS "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_changelogs_fk" FOREIGN KEY ("changelogs_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_changelogs_id_idx" ON "payload_locked_documents_rels" USING btree ("changelogs_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "changelogs_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "changelogs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_changelogs_v_version_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_changelogs_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "changelogs_tags" CASCADE;
  DROP TABLE "changelogs" CASCADE;
  DROP TABLE "_changelogs_v_version_tags" CASCADE;
  DROP TABLE "_changelogs_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_changelogs_fk";

  DROP INDEX "payload_locked_documents_rels_changelogs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "changelogs_id";
  DROP TYPE "public"."enum_changelogs_status";
  DROP TYPE "public"."enum__changelogs_v_version_status";`)
}
