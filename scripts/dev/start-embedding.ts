import { startEmbeddingSidecar, stopEmbeddingSidecar } from '../dev/embedding-process'

const sidecar = await startEmbeddingSidecar()
let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  void stopEmbeddingSidecar(sidecar)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

const exitCode = await sidecar.exited
process.exitCode = exitCode
