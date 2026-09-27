import type { createServerEnv } from '../env-schema'

type ServerEnv = ReturnType<typeof createServerEnv>
type R2StorageEnv = Pick<
  ServerEnv,
  'R2_ACCESS_KEY_ID' | 'R2_BUCKET' | 'R2_ENDPOINT' | 'R2_PUBLIC_URL' | 'R2_REGION' | 'R2_SECRET_ACCESS_KEY'
>

const requiredR2Settings = [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL',
] as const

type RequiredR2Setting = (typeof requiredR2Settings)[number]
type ConfiguredR2StorageEnv = R2StorageEnv & Required<Pick<R2StorageEnv, RequiredR2Setting>>

function assertRequiredR2Settings(env: R2StorageEnv): asserts env is ConfiguredR2StorageEnv {
  const missingSettings = requiredR2Settings.filter((key) => !env[key]?.trim())
  if (missingSettings.length > 0) {
    throw new Error(`R2 storage is partially configured. Missing: ${missingSettings.join(', ')}`)
  }
}

export function buildR2StorageOptions(env: R2StorageEnv) {
  const hasR2Configuration = requiredR2Settings.some((key) => Boolean(env[key]?.trim()))

  if (!hasR2Configuration) {
    return undefined
  }

  assertRequiredR2Settings(env)

  const endpoint = new URL(env.R2_ENDPOINT)

  if (
    endpoint.protocol !== 'https:' ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error('R2_ENDPOINT must be an HTTPS account-level endpoint without a bucket path')
  }

  const publicURL = new URL(env.R2_PUBLIC_URL)

  if (publicURL.protocol !== 'https:' || publicURL.username || publicURL.password) {
    throw new Error('R2_PUBLIC_URL must be an HTTPS URL without embedded credentials')
  }

  const publicBaseURL = publicURL.toString().replace(/\/+$/, '')

  return {
    bucket: env.R2_BUCKET,
    collections: {
      media: {
        disablePayloadAccessControl: true as const,
        generateFileURL: ({ filename, prefix }: { filename: string; prefix?: string }) => {
          const pathSegments = [prefix, filename]
            .filter((segment): segment is string => Boolean(segment))
            .flatMap((segment) => segment.split('/'))

          if (
            pathSegments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))
          ) {
            throw new Error('R2 media path contains an invalid segment')
          }

          const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/')
          return `${publicBaseURL}/${encodedPath}`
        },
        prefix: 'payload-cms',
      },
    },
    config: {
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
      endpoint: endpoint.origin,
      forcePathStyle: true,
      region: env.R2_REGION,
    },
  }
}
