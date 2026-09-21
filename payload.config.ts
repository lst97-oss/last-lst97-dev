import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// NOTE(payload-bun): node:path + node:url kept — Payload/Vite config-file resolution
// requires Node specifier semantics here. All app/routes/lib code uses Bun.env + Web APIs.
import { buildConfig } from 'payload'
import sharp from 'sharp'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

type BunEnvShape = { env?: Record<string, string | undefined> }
type GlobalWithBunEnv = typeof globalThis & { Bun?: BunEnvShape }

function readEnv(key: string): string | undefined {
  const bunEnv = (globalThis as GlobalWithBunEnv).Bun?.env
  if (bunEnv && typeof bunEnv[key] === 'string') {
    return bunEnv[key]
  }
  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined
  return nodeEnv?.[key]
}

const databaseUrl = readEnv('DATABASE_URL')
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL — set it in .env (e.g. postgres://postgres:postgres@localhost:5432/app)')
}

// Bun-first: Bun.env when running under bun, process.env fallback for payload CLI node-compat bundling.
const payloadSecret = readEnv('PAYLOAD_SECRET')
if (!payloadSecret) {
  throw new Error('Missing PAYLOAD_SECRET — generate one and set it in .env')
}

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      importMapFile: path.resolve(dirname, 'src/payload-import-map.ts'),
    },
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      admin: {
        useAsTitle: 'email',
      },
      fields: [
        // Email added by default via auth
      ],
    },
  ],
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
  }),
  editor: lexicalEditor(),
  secret: payloadSecret,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
