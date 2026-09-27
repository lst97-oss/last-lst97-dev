import { childEnvironment, startEmbeddingSidecar, stopEmbeddingSidecar } from './embedding-process'

const projectRoot = import.meta.dir.replace(/[/\\]scripts$/, '')
const ragEnabled = Bun.env.KNOWLEDGE_RAG_ENABLED === 'true'
let sidecar: Bun.Subprocess | undefined

const stop = () => {
  if (sidecar) void stopEmbeddingSidecar(sidecar)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

try {
  if (ragEnabled) sidecar = await startEmbeddingSidecar()
  const vite = Bun.spawn(['bunx', '--bun', 'vite', 'dev', '--port', '3000'], {
    cwd: projectRoot,
    env: childEnvironment(),
    stderr: 'inherit',
    stdout: 'inherit',
  })
  process.on('SIGINT', () => vite.kill('SIGTERM'))
  process.on('SIGTERM', () => vite.kill('SIGTERM'))
  process.exitCode = await vite.exited
} finally {
  if (sidecar) await stopEmbeddingSidecar(sidecar)
}
