export {}

const migrationStatus = Bun.spawn(['bunx', 'payload', 'migrate:status'], {
  stderr: 'pipe',
  stdout: 'pipe',
})

const [stdout, stderr, exitCode] = await Promise.all([
  new Response(migrationStatus.stdout).text(),
  new Response(migrationStatus.stderr).text(),
  migrationStatus.exited,
])

if (stdout) process.stdout.write(stdout)
if (stderr) process.stderr.write(stderr)
if (exitCode !== 0) process.exit(exitCode)

const ranStatuses = stdout
  .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
  .split('\n')
  .filter((line) => line.includes('│'))
  .map((line) =>
    line
      .split('│')
      .map((cell) => cell.trim())
      .at(-2),
  )
  .filter((status): status is string => status === 'Yes' || status === 'No')

if (ranStatuses.length === 0) {
  console.error('Could not read Payload migration status; stopping dev startup to avoid schema drift.')
  process.exit(1)
}

const pendingCount = ranStatuses.filter((status) => status === 'No').length
if (pendingCount > 0) {
  console.error(
    `Payload has ${pendingCount} pending migration${pendingCount === 1 ? '' : 's'}. Run bun run db:migrate, then restart dev.`,
  )
  process.exit(1)
}

console.info('Payload migrations are up to date.')
