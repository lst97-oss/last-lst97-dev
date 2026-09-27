export interface KnowledgeMigrationExecutor {
  query(statement: string): Promise<unknown>
}

const migrationStatements = [
  'CREATE EXTENSION IF NOT EXISTS vector',
  `CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
    "source_type" varchar(24) NOT NULL,
    "source_id" varchar(512) NOT NULL,
    "chunk_index" integer NOT NULL CHECK ("chunk_index" >= 0),
    "title" varchar(500) NOT NULL,
    "url" text NOT NULL,
    "content" text NOT NULL,
    "content_hash" char(64) NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "is_public" boolean NOT NULL DEFAULT false,
    "source_updated_at" timestamptz,
    "indexed_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "knowledge_chunks_source_chunk_pk" PRIMARY KEY ("source_type", "source_id", "chunk_index"),
    CONSTRAINT "knowledge_chunks_source_type_check" CHECK ("source_type" IN ('post', 'project', 'profile', 'github', 'github-private', 'github-profile', 'github-contrib', 'github-contrib-private', 'wakatime'))
  )`,
  'ALTER TABLE "knowledge_chunks" DROP CONSTRAINT IF EXISTS "knowledge_chunks_source_type_check"',
  `ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_type_check" CHECK ("source_type" IN ('post', 'project', 'profile', 'github', 'github-private', 'github-profile', 'github-contrib', 'github-contrib-private', 'wakatime'))`,
  'CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops)',
  `CREATE TABLE IF NOT EXISTS "knowledge_projects" (
    "source_type" varchar(24) NOT NULL CHECK ("source_type" IN ('github', 'github-private')),
    "source_id" varchar(512) NOT NULL,
    "title" varchar(500) NOT NULL,
    "url" text NOT NULL,
    "is_public" boolean NOT NULL,
    "summary" varchar(500) NOT NULL,
    "created_at" timestamptz,
    "updated_at" timestamptz,
    "stars" integer CHECK ("stars" IS NULL OR "stars" >= 0),
    "forks" integer CHECK ("forks" IS NULL OR "forks" >= 0),
    "primary_language" varchar(100),
    "languages" text[] NOT NULL DEFAULT '{}',
    "software_kinds" text[] NOT NULL DEFAULT '{}',
    "github_topics" text[] NOT NULL DEFAULT '{}',
    "curated_topics" text[] NOT NULL DEFAULT '{}',
    "indexed_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "knowledge_projects_source_pk" PRIMARY KEY ("source_type", "source_id"),
    CONSTRAINT "knowledge_projects_visibility_check" CHECK ("is_public" = ("source_type" = 'github')),
    CONSTRAINT "knowledge_projects_kinds_check" CHECK ("software_kinds" <@ ARRAY['web_app', 'mobile_app', 'desktop_app', 'api_backend', 'cli_tool', 'library_package', 'automation_devtool', 'data_ml', 'game', 'infrastructure_devops', 'plugin_extension', 'other']::text[])
  )`,
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_languages_gin_idx" ON "knowledge_projects" USING gin ("languages")',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_kinds_gin_idx" ON "knowledge_projects" USING gin ("software_kinds")',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_github_topics_gin_idx" ON "knowledge_projects" USING gin ("github_topics")',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_curated_topics_gin_idx" ON "knowledge_projects" USING gin ("curated_topics")',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_created_at_idx" ON "knowledge_projects" ("created_at" DESC NULLS LAST)',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_updated_at_idx" ON "knowledge_projects" ("updated_at" DESC NULLS LAST)',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_stars_idx" ON "knowledge_projects" ("stars" DESC NULLS LAST)',
  'CREATE INDEX IF NOT EXISTS "knowledge_projects_forks_idx" ON "knowledge_projects" ("forks" DESC NULLS LAST)',
  `CREATE TABLE IF NOT EXISTS "wakatime_heartbeats" (
    "waka_id" uuid PRIMARY KEY,
    "day" date NOT NULL,
    "time" timestamptz NOT NULL,
    "project" varchar(500),
    "language" varchar(120),
    "category" varchar(60),
    "type" varchar(20),
    "branch" varchar(255),
    "is_write" boolean NOT NULL DEFAULT false,
    "duration_seconds" double precision NOT NULL DEFAULT 0 CHECK ("duration_seconds" >= 0),
    "entity_hash" char(64) NOT NULL,
    "dependencies" text[] NOT NULL DEFAULT '{}',
    "ai_coding" boolean NOT NULL DEFAULT false
  )`,
  'DROP INDEX IF EXISTS "wakatime_heartbeats_project_day_idx"',
  'DROP INDEX IF EXISTS "wakatime_heartbeats_language_day_idx"',
  'CREATE INDEX IF NOT EXISTS "wakatime_heartbeats_day_idx" ON "wakatime_heartbeats" ("day") INCLUDE ("duration_seconds")',
  `CREATE TABLE IF NOT EXISTS "wakatime_daily_summary" (
    "day" date PRIMARY KEY,
    "total_seconds" double precision NOT NULL DEFAULT 0 CHECK ("total_seconds" >= 0),
    "heartbeat_count" integer NOT NULL DEFAULT 0 CHECK ("heartbeat_count" >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS "wakatime_daily_projects" (
    "day" date NOT NULL,
    "project" text NOT NULL,
    "seconds" double precision NOT NULL DEFAULT 0 CHECK ("seconds" >= 0),
    "heartbeats" integer NOT NULL DEFAULT 0 CHECK ("heartbeats" >= 0),
    CONSTRAINT "wakatime_daily_projects_pk" PRIMARY KEY ("day", "project")
  )`,
  `CREATE TABLE IF NOT EXISTS "wakatime_daily_languages" (
    "day" date NOT NULL,
    "language" text NOT NULL,
    "seconds" double precision NOT NULL DEFAULT 0 CHECK ("seconds" >= 0),
    "heartbeats" integer NOT NULL DEFAULT 0 CHECK ("heartbeats" >= 0),
    CONSTRAINT "wakatime_daily_languages_pk" PRIMARY KEY ("day", "language")
  )`,
  `CREATE TABLE IF NOT EXISTS "wakatime_imports" (
    "id" serial PRIMARY KEY,
    "started_at" timestamptz NOT NULL DEFAULT now(),
    "completed_at" timestamptz,
    "days_count" integer NOT NULL DEFAULT 0,
    "heartbeat_count" integer NOT NULL DEFAULT 0,
    "range_start" date,
    "range_end" date,
    "status" varchar(20) NOT NULL DEFAULT 'running'
  )`,
] as const

export async function migrateKnowledgeDatabase(database: KnowledgeMigrationExecutor): Promise<void> {
  try {
    await database.query('BEGIN')
    for (const statement of migrationStatements) await database.query(statement)
    await database.query('COMMIT')
  } catch {
    try {
      await database.query('ROLLBACK')
    } catch {
      // Preserve the sanitized migration error if cleanup also fails.
    }
    throw new Error('Knowledge database migration failed')
  }
}
