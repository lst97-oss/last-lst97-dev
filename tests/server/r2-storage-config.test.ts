import { describe, expect, it } from 'bun:test'

import { buildR2StorageOptions } from '../../src/server/storage/r2-storage-config'
import { createServerEnv } from '../../src/server/env-schema'

const coreEnv = {
  DATABASE_URL: 'postgres://portfolio:secret@localhost:5432/portfolio',
  PAYLOAD_SECRET: 'a-long-enough-payload-secret-value',
}

describe('buildR2StorageOptions', () => {
  it('leaves local storage untouched when R2 is not configured', () => {
    expect(buildR2StorageOptions(createServerEnv(coreEnv))).toBeUndefined()
  })

  it('rejects partial credentials without exposing any supplied values', () => {
    expect(() => buildR2StorageOptions(createServerEnv({
      ...coreEnv,
      R2_ACCESS_KEY_ID: 'secret-access-key-value',
      R2_BUCKET: 'private-bucket-name',
    }))).toThrow('R2 storage is partially configured. Missing: R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_PUBLIC_URL')

    try {
      buildR2StorageOptions(createServerEnv({
        ...coreEnv,
        R2_ACCESS_KEY_ID: 'secret-access-key-value',
        R2_BUCKET: 'private-bucket-name',
      }))
    } catch (error) {
      expect(String(error)).not.toContain('secret-access-key-value')
      expect(String(error)).not.toContain('private-bucket-name')
    }
  })

  it('uses the configured collection prefix and public domain for media URLs', () => {
    const options = buildR2StorageOptions(createServerEnv({
      ...coreEnv,
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_BUCKET: 'test-bucket',
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_PUBLIC_URL: 'https://media.example.test/',
      R2_REGION: 'auto',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
    }))

    expect(options).toMatchObject({
      bucket: 'test-bucket',
      collections: {
        media: {
          prefix: 'payload-cms',
        },
      },
      config: {
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        endpoint: 'https://account.r2.cloudflarestorage.com',
        forcePathStyle: true,
        region: 'auto',
      },
    })
    expect(options?.collections.media.generateFileURL({
      filename: 'profile photo.png',
      prefix: 'payload-cms',
    })).toBe('https://media.example.test/payload-cms/profile%20photo.png')
  })

  it('rejects insecure or path-qualified R2 endpoints', () => {
    expect(() => buildR2StorageOptions(createServerEnv({
      ...coreEnv,
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_BUCKET: 'test-bucket',
      R2_ENDPOINT: 'http://account.r2.cloudflarestorage.com',
      R2_PUBLIC_URL: 'https://media.example.test',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
    }))).toThrow('R2_ENDPOINT must be an HTTPS account-level endpoint without a bucket path')
  })
})
