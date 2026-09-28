import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type ServerEnvSource = Partial<
  Record<
    | 'CONTACT_TO'
    | 'CHAT_CONTEXT_SIGNING_SECRET'
    | 'CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL'
    | 'CHAT_STREAM_MAX_MS'
    | 'CHAT_TOOL_TIMEOUT_MS'
    | 'DATABASE_URL'
    | 'EMAIL_FROM'
    | 'EMAIL_FROM_NAME'
    | 'LOG_LEVEL'
    | 'KNOWLEDGE_DATABASE_URL'
    | 'KNOWLEDGE_EMBEDDING_API_KEY'
    | 'KNOWLEDGE_EMBEDDING_HOST'
    | 'KNOWLEDGE_EMBEDDING_MODEL'
    | 'KNOWLEDGE_EMBEDDING_PORT'
    | 'KNOWLEDGE_EMBEDDING_SERVER_PATH'
    | 'KNOWLEDGE_EMBEDDING_TIMEOUT_MS'
    | 'KNOWLEDGE_EMBEDDING_URL'
    | 'KNOWLEDGE_QUERY_EMBEDDING_URL'
    | 'KNOWLEDGE_RAG_ENABLED'
    | 'MODERATION_MIN_CONFIDENCE'
    | 'NODE_ENV'
    | 'OPENROUTER_API_KEY'
    | 'OPENROUTER_APP_TITLE'
    | 'OPENROUTER_MODEL'
    | 'OPENROUTER_PLANNER_MODEL'
    | 'OPENROUTER_SYSTEM_PROMPT'
    | 'OPENROUTER_TIMEOUT_MS'
    | 'PAYLOAD_PUBLIC_SERVER_URL'
    | 'PAYLOAD_SECRET'
    | 'PUBLIC_SITE_URL'
    | 'R2_ACCESS_KEY_ID'
    | 'R2_BUCKET'
    | 'R2_ENDPOINT'
    | 'R2_PUBLIC_URL'
    | 'R2_REGION'
    | 'R2_SECRET_ACCESS_KEY'
    | 'SMTP_APP_PASSWORD'
    | 'SMTP_USER'
    | 'TURNSTILE_SITE_KEY'
    | 'TURNSTILE_SECRET_KEY'
    | 'TYPESAFE_API_KEY'
    | 'RATE_LIMIT_HASH_SECRET'
    | 'SILICONFLOW_API_KEY'
    | 'UNSLOTH_EMBEDDING_MODEL_PATH',
    string | undefined
  >
>

export type IntegrationEnvKey =
  | 'CONTACT_TO'
  | 'CHAT_CONTEXT_SIGNING_SECRET'
  | 'KNOWLEDGE_DATABASE_URL'
  | 'OPENROUTER_API_KEY'
  | 'OPENROUTER_MODEL'
  | 'SMTP_APP_PASSWORD'
  | 'SMTP_USER'
  | 'TURNSTILE_SECRET_KEY'
  | 'TYPESAFE_API_KEY'
  | 'RATE_LIMIT_HASH_SECRET'
  | 'SILICONFLOW_API_KEY'

export function requireIntegrationEnv(name: IntegrationEnvKey, value: string | undefined): string {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    throw new Error(`Missing required server environment variable: ${name}`)
  }
  return normalizedValue
}

export function createServerEnv(source: ServerEnvSource) {
  return createEnv({
    server: {
      CONTACT_TO: z.email().optional(),
      CHAT_CONTEXT_SIGNING_SECRET: z.string().min(32).optional(),
      CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: z
        .url()
        .refine(
          (value) => {
            const url = new URL(value)
            return (
              url.protocol === 'https:' &&
              ['discord.com', 'discordapp.com'].includes(url.hostname) &&
              /^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname) &&
              !url.port &&
              !url.username &&
              !url.password &&
              !url.search &&
              !url.hash
            )
          },
          { message: 'must be an HTTPS Discord webhook URL' },
        )
        .optional(),
      CHAT_STREAM_MAX_MS: z.coerce.number().int().positive().default(90_000),
      CHAT_TOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
      DATABASE_URL: z.url().refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
        message: 'must use the postgres or postgresql protocol',
      }),
      EMAIL_FROM: z.email().optional(),
      EMAIL_FROM_NAME: z.string().default('LAST//OS'),
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      KNOWLEDGE_DATABASE_URL: z
        .url()
        .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
          message: 'must use the postgres or postgresql protocol',
        })
        .optional(),
      KNOWLEDGE_EMBEDDING_API_KEY: z.string().min(1).optional(),
      KNOWLEDGE_EMBEDDING_HOST: z.string().min(1).default('127.0.0.1'),
      KNOWLEDGE_EMBEDDING_MODEL: z.string().min(1).default('Qwen/Qwen3-Embedding-0.6B'),
      KNOWLEDGE_EMBEDDING_PORT: z.coerce.number().int().min(1).max(65_535).default(8_787),
      KNOWLEDGE_EMBEDDING_SERVER_PATH: z.string().trim().min(1).default('llama-server'),
      KNOWLEDGE_EMBEDDING_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
      KNOWLEDGE_EMBEDDING_URL: z.url().default('http://127.0.0.1:8787/v1'),
      KNOWLEDGE_QUERY_EMBEDDING_URL: z.url().default('https://api.siliconflow.com/v1'),
      KNOWLEDGE_RAG_ENABLED: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
      MODERATION_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.75),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      OPENROUTER_API_KEY: z.string().min(1).optional(),
      OPENROUTER_APP_TITLE: z.string().default('Personal OS Portfolio'),
      OPENROUTER_MODEL: z.string().min(1).optional(),
      OPENROUTER_PLANNER_MODEL: z.string().min(1).optional(),
      OPENROUTER_SYSTEM_PROMPT: z.string().min(1).optional(),
      OPENROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
      PAYLOAD_PUBLIC_SERVER_URL: z.url().optional(),
      PAYLOAD_SECRET: z.string().min(1),
      PUBLIC_SITE_URL: z.url().optional(),
      R2_ACCESS_KEY_ID: z.string().min(1).optional(),
      R2_BUCKET: z.string().min(3).max(63).optional(),
      R2_ENDPOINT: z.url().optional(),
      R2_PUBLIC_URL: z.url().optional(),
      R2_REGION: z.literal('auto').default('auto'),
      R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
      SMTP_APP_PASSWORD: z.string().min(1).optional(),
      SMTP_USER: z.email().optional(),
      TURNSTILE_SITE_KEY: z.string().min(1).optional(),
      TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
      TYPESAFE_API_KEY: z.string().min(1).optional(),
      RATE_LIMIT_HASH_SECRET: z.string().min(32).optional(),
      SILICONFLOW_API_KEY: z.string().min(1).optional(),
      UNSLOTH_EMBEDDING_MODEL_PATH: z.string().min(1).optional(),
    },
    runtimeEnvStrict: {
      CONTACT_TO: source.CONTACT_TO,
      CHAT_CONTEXT_SIGNING_SECRET: source.CHAT_CONTEXT_SIGNING_SECRET,
      CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: source.CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL,
      CHAT_STREAM_MAX_MS: source.CHAT_STREAM_MAX_MS,
      CHAT_TOOL_TIMEOUT_MS: source.CHAT_TOOL_TIMEOUT_MS,
      DATABASE_URL: source.DATABASE_URL,
      EMAIL_FROM: source.EMAIL_FROM,
      EMAIL_FROM_NAME: source.EMAIL_FROM_NAME,
      LOG_LEVEL: source.LOG_LEVEL,
      KNOWLEDGE_DATABASE_URL: source.KNOWLEDGE_DATABASE_URL,
      KNOWLEDGE_EMBEDDING_API_KEY: source.KNOWLEDGE_EMBEDDING_API_KEY,
      KNOWLEDGE_EMBEDDING_HOST: source.KNOWLEDGE_EMBEDDING_HOST,
      KNOWLEDGE_EMBEDDING_MODEL: source.KNOWLEDGE_EMBEDDING_MODEL,
      KNOWLEDGE_EMBEDDING_PORT: source.KNOWLEDGE_EMBEDDING_PORT,
      KNOWLEDGE_EMBEDDING_SERVER_PATH: source.KNOWLEDGE_EMBEDDING_SERVER_PATH,
      KNOWLEDGE_EMBEDDING_TIMEOUT_MS: source.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
      KNOWLEDGE_EMBEDDING_URL: source.KNOWLEDGE_EMBEDDING_URL,
      KNOWLEDGE_QUERY_EMBEDDING_URL: source.KNOWLEDGE_QUERY_EMBEDDING_URL,
      KNOWLEDGE_RAG_ENABLED: source.KNOWLEDGE_RAG_ENABLED,
      MODERATION_MIN_CONFIDENCE: source.MODERATION_MIN_CONFIDENCE,
      NODE_ENV: source.NODE_ENV,
      OPENROUTER_API_KEY: source.OPENROUTER_API_KEY,
      OPENROUTER_APP_TITLE: source.OPENROUTER_APP_TITLE,
      OPENROUTER_MODEL: source.OPENROUTER_MODEL,
      OPENROUTER_PLANNER_MODEL: source.OPENROUTER_PLANNER_MODEL,
      OPENROUTER_SYSTEM_PROMPT: source.OPENROUTER_SYSTEM_PROMPT,
      OPENROUTER_TIMEOUT_MS: source.OPENROUTER_TIMEOUT_MS,
      PAYLOAD_PUBLIC_SERVER_URL: source.PAYLOAD_PUBLIC_SERVER_URL,
      PAYLOAD_SECRET: source.PAYLOAD_SECRET,
      PUBLIC_SITE_URL: source.PUBLIC_SITE_URL,
      R2_ACCESS_KEY_ID: source.R2_ACCESS_KEY_ID,
      R2_BUCKET: source.R2_BUCKET,
      R2_ENDPOINT: source.R2_ENDPOINT,
      R2_PUBLIC_URL: source.R2_PUBLIC_URL,
      R2_REGION: source.R2_REGION,
      R2_SECRET_ACCESS_KEY: source.R2_SECRET_ACCESS_KEY,
      SMTP_APP_PASSWORD: source.SMTP_APP_PASSWORD,
      SMTP_USER: source.SMTP_USER,
      TURNSTILE_SITE_KEY: source.TURNSTILE_SITE_KEY,
      TURNSTILE_SECRET_KEY: source.TURNSTILE_SECRET_KEY,
      TYPESAFE_API_KEY: source.TYPESAFE_API_KEY,
      RATE_LIMIT_HASH_SECRET: source.RATE_LIMIT_HASH_SECRET,
      SILICONFLOW_API_KEY: source.SILICONFLOW_API_KEY,
      UNSLOTH_EMBEDDING_MODEL_PATH: source.UNSLOTH_EMBEDDING_MODEL_PATH,
    },
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      const details = issues.map((issue) => `${issue.path?.join('.') ?? 'environment'}: ${issue.message}`)
      throw new Error(`Environment validation failed: ${details.join('; ')}`)
    },
  })
}
