import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { s3Storage } from '@payloadcms/storage-s3'
import { sharpTransformer } from '@payloadcms/transformer-sharp'
import nodemailer from 'nodemailer'
import { buildConfig } from 'payload'

import { denyUserCreation } from './src/collections/access'
import { Changelogs } from './src/collections/Changelogs'
import { contentEditor } from './src/collections/fields/content-editor'
import { Media, mediaVariants } from './src/collections/Media'
import { Posts } from './src/collections/Posts'
import { Projects } from './src/collections/Projects'
import { Tags } from './src/collections/Tags'
import { Topics } from './src/collections/Topics'
import { migrations } from './src/migrations'
import { checkPinnedPostgresIdentity, decodePostgresCa, withoutSslMode } from './src/server/database/postgres-ca'
import { getServerEnv } from './src/server/env'
import { knowledgePayloadTasks } from './src/server/knowledge/payload-tasks'
import { resolvePayloadServerUrl } from './src/server/security/payload-server-url'
import { buildR2StorageOptions } from './src/server/storage/r2-storage-config'

const env = getServerEnv()
const postgresCa = decodePostgresCa(env.POSTGRES_SSL_CA)
const r2StorageOptions = buildR2StorageOptions(env)
const projectDirectory =
  typeof Bun !== 'undefined'
    ? import.meta.dir
    : (import.meta.dirname ?? decodeURIComponent(new URL('.', import.meta.url).pathname).replace(/\/$/, ''))
const projectPath = (relativePath: string) => `${projectDirectory}/${relativePath.replace(/^\.\//, '')}`
const payloadEmailAdapter =
  env.SMTP_USER && env.SMTP_APP_PASSWORD
    ? nodemailerAdapter({
        defaultFromAddress: env.EMAIL_FROM ?? env.SMTP_USER,
        defaultFromName: env.EMAIL_FROM_NAME,
        skipVerify: true,
        transport: nodemailer.createTransport({
          auth: { pass: env.SMTP_APP_PASSWORD, user: env.SMTP_USER },
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
        }),
      })
    : undefined

export default buildConfig({
  // Nothing in this app queries GraphQL — the site reads content over REST via
  // `src/server/content/server-functions.ts`. Leaving the route mounted
  // exposes an unauthenticated schema-introspection surface and an
  // unbounded-complexity query vector, so the endpoint is not registered.
  graphQL: {
    disable: true,
  },
  // Caps relationship population at 5. The default of 10 makes a
  // self-referential relationship able to recurse deep enough to stall a
  // request; nothing in this schema legitimately nests that far.
  maxDepth: 5,
  // `serverURL` drives cookie `Secure`/`SameSite` scoping and Payload's CORS
  // origin checks. A localhost value in production silently breaks admin
  // sign-in and lets any origin be treated as trusted, so fail at boot
  // rather than shipping a misconfigured admin panel.
  serverURL: resolvePayloadServerUrl(env),
  admin: {
    user: 'users',
    importMap: {
      importMapFile: projectPath('./src/payload-import-map.ts'),
    },
  },
  collections: [
    {
      slug: 'users',
      auth: {
        // Password-guessing protection. Payload counts consecutive failures
        // per user and locks the account for `lockTime` ms; a successful login
        // resets the counter. Five attempts is low enough to make an online
        // oracle useless and high enough to survive fat-fingered retries.
        maxLoginAttempts: 5,
        lockTime: 10 * 60 * 1000,
      },
      access: {
        // Single-operator site: the API must never mint a new account. See
        // denyUserCreation for why this is not `disableLocalStrategy`.
        create: denyUserCreation,
      },
      admin: {
        useAsTitle: 'email',
      },
      fields: [],
    },
    Media,
    Changelogs,
    Posts,
    Projects,
    Topics,
    Tags,
  ],
  db: postgresAdapter({
    // Schema changes are applied through the committed Payload migrations, not dev auto-push.
    push: false,
    prodMigrations: migrations,
    pool: {
      // With a pinned CA the `sslmode` query parameter must be removed; node-postgres
      // lets the connection string override the pool's `ssl` option when a mode is present.
      connectionString: postgresCa ? withoutSslMode(env.DATABASE_URL) : env.DATABASE_URL,
      // The hosted Postgres allows 20 connections in total, and every
      // serverless instance gets its own pools. Three pools share one
      // six-connection budget per instance — this one, the knowledge pool and
      // the WakaTime history pool, each capped at 2 — so three warm instances
      // still fit under the server limit. Tool calls run sequentially, so the
      // caps cost nothing.
      max: 2,
      ...(postgresCa
        ? {
            ssl: {
              ca: postgresCa,
              rejectUnauthorized: true,
              // Railway's certificate names `localhost` and the private domain,
              // not the public TCP-proxy host, so node-postgres would reject the
              // hostname. The pinned CA authenticates the server; the check below
              // still fails closed if the localhost SAN disappears.
              checkServerIdentity: checkPinnedPostgresIdentity,
            },
          }
        : {}),
    },
  }),
  email: payloadEmailAdapter,
  jobs: {
    tasks: knowledgePayloadTasks,
    autoRun: [{ cron: '* * * * *', queue: 'knowledge', limit: 10 }],
  },
  editor: contentEditor,
  secret: env.PAYLOAD_SECRET,
  storage: r2StorageOptions ? [s3Storage(r2StorageOptions)] : [],
  upload: {
    // Payload 4 removed the top-level `sharp` option and `upload.imageSizes`;
    // the Sharp transformer owns both, and writes `variants` back onto Media.
    transformers: [sharpTransformer({ collections: { media: { variants: mediaVariants } } })],
  },
  typescript: {
    outputFile: projectPath('./payload-types.ts'),
  },
})
