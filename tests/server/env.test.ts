import { describe, expect, it } from 'bun:test'

import { createServerEnv, requireIntegrationEnv } from '../../src/server/env-schema'

const validCoreEnv = {
  DATABASE_URL: 'postgres://portfolio:secret@localhost:5432/portfolio',
  PAYLOAD_SECRET: 'a-long-enough-payload-secret-value',
}

describe('createServerEnv', () => {
  it('applies defaults and treats blank optional integrations as unset', () => {
    const env = createServerEnv({
      ...validCoreEnv,
      EMAIL_FROM_NAME: '',
      LOG_LEVEL: '',
      OPENROUTER_TIMEOUT_MS: '',
      SMTP_USER: '',
    })

    expect(env).toMatchObject({
      DATABASE_URL: validCoreEnv.DATABASE_URL,
      PAYLOAD_SECRET: validCoreEnv.PAYLOAD_SECRET,
      EMAIL_FROM_NAME: 'LAST//OS',
      LOG_LEVEL: 'info',
      OPENROUTER_APP_TITLE: 'Personal OS Portfolio',
      OPENROUTER_TIMEOUT_MS: 20_000,
      MODERATION_MIN_CONFIDENCE: 0.6,
    })
    expect(env.SMTP_USER).toBeUndefined()
    expect(env.OPENROUTER_API_KEY).toBeUndefined()
  })

  it('requires core settings and only accepts Postgres database URLs', () => {
    expect(() => createServerEnv({ PAYLOAD_SECRET: validCoreEnv.PAYLOAD_SECRET })).toThrow('DATABASE_URL')
    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        DATABASE_URL: 'mysql://portfolio:secret@localhost:3306/portfolio',
      }),
    ).toThrow('postgres or postgresql protocol')
    expect(() =>
      createServerEnv({
        DATABASE_URL: validCoreEnv.DATABASE_URL,
      }),
    ).toThrow('PAYLOAD_SECRET')
  })

  it('validates supplied integration and operational settings without requiring them', () => {
    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        OPENROUTER_API_KEY: 'test-key',
        OPENROUTER_MODEL: 'test/model',
        SMTP_USER: 'not-an-email',
      }),
    ).toThrow('SMTP_USER')

    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        OPENROUTER_TIMEOUT_MS: '0',
      }),
    ).toThrow('OPENROUTER_TIMEOUT_MS')

    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        LOG_LEVEL: 'verbose',
      }),
    ).toThrow('LOG_LEVEL')

    expect(createServerEnv(validCoreEnv)).toMatchObject({
      OPENROUTER_API_KEY: undefined,
      OPENROUTER_MODEL: undefined,
      SMTP_USER: undefined,
      SMTP_APP_PASSWORD: undefined,
    })
  })

  it('exposes optional R2 settings for deployment-specific storage configuration', () => {
    expect(
      createServerEnv({
        ...validCoreEnv,
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_BUCKET: 'test-bucket',
        R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
        R2_PUBLIC_URL: 'https://media.example.test',
        R2_REGION: 'auto',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
      }),
    ).toMatchObject({
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_BUCKET: 'test-bucket',
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_PUBLIC_URL: 'https://media.example.test',
      R2_REGION: 'auto',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
    })
  })

  it('requires integration credentials only when the integration is used', () => {
    const env = createServerEnv(validCoreEnv)

    expect(() => requireIntegrationEnv('OPENROUTER_API_KEY', env.OPENROUTER_API_KEY)).toThrow(
      'Missing required server environment variable: OPENROUTER_API_KEY',
    )
    expect(requireIntegrationEnv('OPENROUTER_MODEL', ' test/model ')).toBe('test/model')
  })

  it('keeps Turnstile credentials optional at startup but requires the secret when verification is used', () => {
    const env = createServerEnv({
      ...validCoreEnv,
      TURNSTILE_SITE_KEY: 'public-test-site-key',
      TURNSTILE_SECRET_KEY: 'server-test-secret-key',
    })

    expect(env.TURNSTILE_SITE_KEY).toBe('public-test-site-key')
    expect(requireIntegrationEnv('TURNSTILE_SECRET_KEY', env.TURNSTILE_SECRET_KEY)).toBe('server-test-secret-key')
    expect(() => requireIntegrationEnv('TURNSTILE_SECRET_KEY', undefined)).toThrow(
      'Missing required server environment variable: TURNSTILE_SECRET_KEY',
    )
  })

  it('validates moderation confidence and signing secret lengths', () => {
    expect(() => createServerEnv({ ...validCoreEnv, MODERATION_MIN_CONFIDENCE: '1.1' })).toThrow(
      'MODERATION_MIN_CONFIDENCE',
    )
    expect(() => createServerEnv({ ...validCoreEnv, CHAT_CONTEXT_SIGNING_SECRET: 'too-short' })).toThrow(
      'CHAT_CONTEXT_SIGNING_SECRET',
    )
    expect(() => createServerEnv({ ...validCoreEnv, RATE_LIMIT_HASH_SECRET: 'also-too-short' })).toThrow(
      'RATE_LIMIT_HASH_SECRET',
    )
  })

  it('keeps local knowledge inference optional and defaults the sidecar settings safely', () => {
    const env = createServerEnv(validCoreEnv)

    expect(env.SILICONFLOW_API_KEY).toBeUndefined()
    expect(env.KNOWLEDGE_QUERY_EMBEDDING_URL).toBe('https://api.siliconflow.com/v1')
    expect(env.KNOWLEDGE_EMBEDDING_URL).toBe('http://127.0.0.1:8787/v1')
    expect(env.KNOWLEDGE_EMBEDDING_MODEL).toBe('Qwen/Qwen3-Embedding-0.6B')
    expect(env.KNOWLEDGE_EMBEDDING_HOST).toBe('127.0.0.1')
    expect(env.KNOWLEDGE_EMBEDDING_PORT).toBe(8787)
    expect(env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS).toBe(15_000)
    expect(env.KNOWLEDGE_RAG_ENABLED).toBe(false)
    expect(env.KNOWLEDGE_EMBEDDING_SERVER_PATH).toBe('llama-server')
    expect(env.KNOWLEDGE_DATABASE_URL).toBeUndefined()
  })

  it('keeps chat streaming budgets optional with safe defaults', () => {
    const env = createServerEnv(validCoreEnv)

    expect(env.CHAT_TOOL_TIMEOUT_MS).toBe(15_000)
    expect(env.CHAT_STREAM_MAX_MS).toBe(90_000)
    expect(createServerEnv({ ...validCoreEnv, CHAT_TOOL_TIMEOUT_MS: '5000' })).toMatchObject({
      CHAT_TOOL_TIMEOUT_MS: 5_000,
    })
    expect(() => createServerEnv({ ...validCoreEnv, CHAT_TOOL_TIMEOUT_MS: '0' })).toThrow('CHAT_TOOL_TIMEOUT_MS')
  })

  it('validates a dedicated PostgreSQL URL for the RAG database without using the Payload URL', () => {
    expect(
      createServerEnv({
        ...validCoreEnv,
        KNOWLEDGE_DATABASE_URL: 'postgres://rag:dev-only@localhost:5433/rag',
      }).KNOWLEDGE_DATABASE_URL,
    ).toBe('postgres://rag:dev-only@localhost:5433/rag')
    expect(() => createServerEnv({ ...validCoreEnv, KNOWLEDGE_DATABASE_URL: 'sqlite://rag.db' })).toThrow(
      'KNOWLEDGE_DATABASE_URL',
    )
  })

  it('validates configured local embedding and SiliconFlow integration settings', () => {
    expect(
      createServerEnv({
        ...validCoreEnv,
        SILICONFLOW_API_KEY: 'test-siliconflow-key',
        KNOWLEDGE_QUERY_EMBEDDING_URL: 'https://embeddings.siliconflow.test/v1',
        KNOWLEDGE_EMBEDDING_API_KEY: 'test-local-api-key',
        KNOWLEDGE_EMBEDDING_URL: 'https://embeddings.example.test/v1',
        KNOWLEDGE_EMBEDDING_MODEL: 'Qwen/Qwen3-Embedding-0.6B',
        KNOWLEDGE_EMBEDDING_HOST: '127.0.0.1',
        KNOWLEDGE_EMBEDDING_PORT: '9000',
        KNOWLEDGE_EMBEDDING_TIMEOUT_MS: '30000',
        KNOWLEDGE_RAG_ENABLED: 'true',
        UNSLOTH_EMBEDDING_MODEL_PATH: '/models/qwen3-embedding-0.6b',
        KNOWLEDGE_EMBEDDING_SERVER_PATH: '/opt/homebrew/bin/llama-server',
      }),
    ).toMatchObject({
      SILICONFLOW_API_KEY: 'test-siliconflow-key',
      KNOWLEDGE_QUERY_EMBEDDING_URL: 'https://embeddings.siliconflow.test/v1',
      KNOWLEDGE_EMBEDDING_API_KEY: 'test-local-api-key',
      KNOWLEDGE_EMBEDDING_URL: 'https://embeddings.example.test/v1',
      KNOWLEDGE_EMBEDDING_PORT: 9000,
      KNOWLEDGE_EMBEDDING_TIMEOUT_MS: 30_000,
      KNOWLEDGE_RAG_ENABLED: true,
      UNSLOTH_EMBEDDING_MODEL_PATH: '/models/qwen3-embedding-0.6b',
      KNOWLEDGE_EMBEDDING_SERVER_PATH: '/opt/homebrew/bin/llama-server',
    })

    expect(() => createServerEnv({ ...validCoreEnv, KNOWLEDGE_QUERY_EMBEDDING_URL: 'not-a-url' })).toThrow(
      'KNOWLEDGE_QUERY_EMBEDDING_URL',
    )
    expect(() => createServerEnv({ ...validCoreEnv, KNOWLEDGE_EMBEDDING_URL: 'not-a-url' })).toThrow(
      'KNOWLEDGE_EMBEDDING_URL',
    )
    expect(() => createServerEnv({ ...validCoreEnv, KNOWLEDGE_EMBEDDING_PORT: '70000' })).toThrow(
      'KNOWLEDGE_EMBEDDING_PORT',
    )
    expect(() => createServerEnv({ ...validCoreEnv, KNOWLEDGE_EMBEDDING_SERVER_PATH: '   ' })).toThrow(
      'KNOWLEDGE_EMBEDDING_SERVER_PATH',
    )
  })

  it('accepts only HTTPS Discord webhook URLs for chat diagnostics', () => {
    const validWebhookEnv = {
      ...validCoreEnv,
      CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456/secret-token',
    } as Parameters<typeof createServerEnv>[0]

    expect(createServerEnv(validWebhookEnv)).toMatchObject({
      CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456/secret-token',
    })
    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: 'https://example.com/api/webhooks/123456/secret-token',
      } as Parameters<typeof createServerEnv>[0]),
    ).toThrow('CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL')
    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: 'http://discord.com/api/webhooks/123456/secret-token',
      } as Parameters<typeof createServerEnv>[0]),
    ).toThrow('CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL')
    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: 'https://discord.com:8443/api/webhooks/123456/secret-token',
      } as Parameters<typeof createServerEnv>[0]),
    ).toThrow('CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL')
    expect(() =>
      createServerEnv({
        ...validCoreEnv,
        CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL: 'https://discord.com/not-a-webhook',
      } as Parameters<typeof createServerEnv>[0]),
    ).toThrow('CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL')
  })
})
