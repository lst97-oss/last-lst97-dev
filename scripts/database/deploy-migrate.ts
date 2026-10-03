/**
 * Apply pending Payload migrations as a deploy step.
 *
 * Why this is separate from `db:migrate` and opt-in: the container image builds
 * with a dummy `DATABASE_URL` that has no server behind it, so an unconditional
 * migrate in `bun run build` would fail the Docker build. The Vercel build has a
 * real `DATABASE_URL`, so that platform opts in with `DEPLOY_MIGRATE=true`.
 *
 * `bun run build` calls this only when that flag is set, which keeps one
 * migration path for every deploy target: this script on Vercel, and
 * `docker-entrypoint.sh` on container start (which must keep running
 * migrations, because an image can sit built for a long time before it boots).
 */

const enabled = process.env.DEPLOY_MIGRATE === 'true'

if (!enabled) {
  console.info(
    '[deploy-migrate] DEPLOY_MIGRATE is not "true" — skipping. Set it on the deploy target to apply migrations during the build.',
  )
  process.exit(0)
}
// Note: `bun run` auto-loads the repository `.env`, so this check passes even
// when only a local `.env` exists. That is harmless here — the DEPLOY_MIGRATE
// opt-in above is the real gate, and a platform that sets the flag is expected
// to supply a real DATABASE_URL too. The check stays as a fast failure for the
// case where someone enables the flag in an environment with no URL at all.
if (!process.env.DATABASE_URL) {
  console.error('[deploy-migrate] DATABASE_URL is unset. Refusing to migrate against an unknown database.')
  process.exit(1)
}

// Top-level `await` below requires this file to be a module; without an export
// TypeScript reports TS1375 and the file is treated as a script.
export {}

const migration = Bun.spawn(['bunx', 'payload', 'migrate', '--force-accept-warning'], {
  env: process.env,
  stdout: 'inherit',
  stderr: 'inherit',
})

const exitCode = await migration.exited

if (exitCode !== 0) {
  console.error(
    '[deploy-migrate] payload migrate failed. The build is aborted so the new code is never deployed against an unmigrated schema.',
  )
  process.exit(exitCode)
}

console.info('[deploy-migrate] migrations applied.')
