import { createServerEnv, requireIntegrationEnv } from './env-schema'
import type { IntegrationEnvKey, ServerEnvSource } from './env-schema'

type ServerEnv = ReturnType<typeof createServerEnv>

let serverEnv: ServerEnv | undefined

function readRuntimeEnv(): ServerEnvSource {
  const source = typeof Bun !== 'undefined'
    ? Bun.env
    : typeof process !== 'undefined'
      ? process.env
      : undefined

  // Payload's CLI currently runs through Node/tsx under `bunx payload`.
  // Keep this fallback isolated here; Bun remains the normal app runtime.
  return {
    CONTACT_TO: source?.CONTACT_TO,
    CHAT_CONTEXT_SIGNING_SECRET: source?.CHAT_CONTEXT_SIGNING_SECRET,
    CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: source?.CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL,
    CLOUDFLARE_ORIGIN_VERIFY_SECRET: source?.CLOUDFLARE_ORIGIN_VERIFY_SECRET,
    CHAT_STREAM_MAX_MS: source?.CHAT_STREAM_MAX_MS,
    CHAT_TOOL_TIMEOUT_MS: source?.CHAT_TOOL_TIMEOUT_MS,
    DATABASE_URL: source?.DATABASE_URL,
    EMAIL_FROM: source?.EMAIL_FROM,
    EMAIL_FROM_NAME: source?.EMAIL_FROM_NAME,
    LOG_LEVEL: source?.LOG_LEVEL,
    KNOWLEDGE_DATABASE_URL: source?.KNOWLEDGE_DATABASE_URL,
    KNOWLEDGE_EMBEDDING_API_KEY: source?.KNOWLEDGE_EMBEDDING_API_KEY,
    KNOWLEDGE_EMBEDDING_HOST: source?.KNOWLEDGE_EMBEDDING_HOST,
    KNOWLEDGE_EMBEDDING_MODEL: source?.KNOWLEDGE_EMBEDDING_MODEL,
    KNOWLEDGE_EMBEDDING_PORT: source?.KNOWLEDGE_EMBEDDING_PORT,
    KNOWLEDGE_EMBEDDING_SERVER_PATH: source?.KNOWLEDGE_EMBEDDING_SERVER_PATH,
    KNOWLEDGE_EMBEDDING_TIMEOUT_MS: source?.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
    KNOWLEDGE_EMBEDDING_URL: source?.KNOWLEDGE_EMBEDDING_URL,
    KNOWLEDGE_QUERY_EMBEDDING_URL: source?.KNOWLEDGE_QUERY_EMBEDDING_URL,
    KNOWLEDGE_RAG_ENABLED: source?.KNOWLEDGE_RAG_ENABLED,
    MODERATION_MIN_CONFIDENCE: source?.MODERATION_MIN_CONFIDENCE,
    NODE_ENV: source?.NODE_ENV,
    OPENROUTER_API_KEY: source?.OPENROUTER_API_KEY,
    OPENROUTER_APP_TITLE: source?.OPENROUTER_APP_TITLE,
    OPENROUTER_MODEL: source?.OPENROUTER_MODEL,
    OPENROUTER_PLANNER_MODEL: source?.OPENROUTER_PLANNER_MODEL,
    OPENROUTER_TIMEOUT_MS: source?.OPENROUTER_TIMEOUT_MS,
    PAYLOAD_PUBLIC_SERVER_URL: source?.PAYLOAD_PUBLIC_SERVER_URL,
    PAYLOAD_SECRET: source?.PAYLOAD_SECRET,
    PUBLIC_SITE_URL: source?.PUBLIC_SITE_URL,
    R2_ACCESS_KEY_ID: source?.R2_ACCESS_KEY_ID,
    R2_BUCKET: source?.R2_BUCKET,
    R2_ENDPOINT: source?.R2_ENDPOINT,
    R2_PUBLIC_URL: source?.R2_PUBLIC_URL,
    R2_REGION: source?.R2_REGION,
    R2_SECRET_ACCESS_KEY: source?.R2_SECRET_ACCESS_KEY,
    SMTP_APP_PASSWORD: source?.SMTP_APP_PASSWORD,
    SMTP_USER: source?.SMTP_USER,
    TURNSTILE_SITE_KEY: source?.TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: source?.TURNSTILE_SECRET_KEY,
    TYPESAFE_API_KEY: source?.TYPESAFE_API_KEY,
    RATE_LIMIT_HASH_SECRET: source?.RATE_LIMIT_HASH_SECRET,
    SILICONFLOW_API_KEY: source?.SILICONFLOW_API_KEY,
    UNSLOTH_EMBEDDING_MODEL_PATH: source?.UNSLOTH_EMBEDDING_MODEL_PATH,
  }
}

export function getServerEnv(): ServerEnv {
  serverEnv ??= createServerEnv(readRuntimeEnv())
  return serverEnv
}

export function requiredServerEnv(name: IntegrationEnvKey): string {
  return requireIntegrationEnv(name, getServerEnv()[name])
}
