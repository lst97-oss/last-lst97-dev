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
})
