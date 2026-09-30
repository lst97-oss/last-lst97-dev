import { describe, expect, test } from 'bun:test'

const buildScript = await Bun.file(new URL('../package.json', import.meta.url)).text()
const build = JSON.parse(buildScript).scripts.build as string
const deployMigrate = await Bun.file(new URL('../scripts/deploy-migrate.ts', import.meta.url)).text()
const entrypoint = await Bun.file(new URL('../docker-entrypoint.sh', import.meta.url)).text()
const dockerfile = await Bun.file(new URL('../Dockerfile', import.meta.url)).text()

describe('deploy-time migrations', () => {
  test('the build applies pending migrations before bundling', () => {
    // Order matters: migrating after `vite build` would ship a bundle built
    // against the old schema, which is the failure this step exists to prevent.
    const migrateAt = build.indexOf('deploy:migrate')
    const viteAt = build.indexOf('vite build')

    expect(migrateAt).toBeGreaterThan(-1)
    expect(viteAt).toBeGreaterThan(-1)
    expect(migrateAt).toBeLessThan(viteAt)
  })

  test('migrations are opt-in so an image can build without a live database', () => {
    // The Docker build stage passes a dummy DATABASE_URL with no server behind
    // it. An unconditional migrate would fail `docker build`, so the script must
    // exit 0 when the flag is absent rather than attempting a connection.
    expect(deployMigrate).toContain("process.env.DEPLOY_MIGRATE === 'true'")
    expect(deployMigrate).toMatch(/if \(!enabled\) \{[\s\S]*?process\.exit\(0\)/)
  })

  test('a failed migration aborts the build instead of shipping mismatched code', () => {
    expect(deployMigrate).toMatch(/if \(exitCode !== 0\) \{[\s\S]*?process\.exit\(exitCode\)/)
  })

  test('the container migrates on start rather than only at build time', () => {
    // An image can sit built for a long time before it boots, so the entrypoint
    // remains the container's migration point and must stay unconditional.
    expect(entrypoint).toContain('payload')
    expect(entrypoint).toContain('migrate')
    // The build stage must not enable the build-time path, or the image would
    // need a reachable database at `docker build` time.
    expect(dockerfile).not.toContain('DEPLOY_MIGRATE=true')
  })

  test('the image build supplies a non-loopback Payload origin', () => {
    // `generate:types` loads payload.config.ts, and the build stage runs with
    // NODE_ENV=production, so `resolvePayloadServerUrl` rejects the loopback
    // DATABASE_URL host. Without this the Docker build dies at that step.
    // Compile-time only: the value must be exported into the RUN layer, never
    // declared as ENV, or it would become the container's baked-in default and
    // the runtime origin would be wrong for anyone deploying elsewhere.
    expect(dockerfile).toMatch(/PAYLOAD_PUBLIC_SERVER_URL=https:\/\/(?!localhost|127\.0\.0\.1)/)
    expect(dockerfile).not.toMatch(/^ENV\s+.*PAYLOAD_PUBLIC_SERVER_URL/m)
    // The guard itself must stay strict — satisfying the build must not mean
    // weakening production boot validation.
    expect(dockerfile).not.toMatch(/SKIP_MIGRATIONS|resolvePayloadServerUrl.*skip/i)
  })
})
