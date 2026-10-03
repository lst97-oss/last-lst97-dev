import { projectRoot } from '../project-root'
import { childEnvironment } from './embedding-process'

const worker = Bun.spawn(
  ['bunx', '--bun', 'payload', 'jobs:run', '--cron', '* * * * *', '--queue', 'knowledge', '--handle-schedules'],
  {
    cwd: projectRoot,
    env: childEnvironment(),
    stderr: 'inherit',
    stdout: 'inherit',
  },
)

let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  if (worker.exitCode === null) worker.kill('SIGTERM')
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.exitCode = await worker.exited
