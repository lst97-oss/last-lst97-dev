const DEFAULT_MODEL = 'Qwen/Qwen3-Embedding-0.6B'
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])
const STARTUP_TIMEOUT_MS = 180_000
const projectRoot = import.meta.dir.replace(/[/\\]scripts$/, '')

export interface EmbeddingServerArgsInput {
  modelPath: string
  host: string
  port: number
  model: string
}

export function buildEmbeddingServerArgs(input: EmbeddingServerArgsInput): string[] {
  const modelPath = input.modelPath.trim()
  if (!modelPath || !modelPath.toLowerCase().endsWith('.gguf')) {
    throw new Error('Set UNSLOTH_EMBEDDING_MODEL_PATH to the downloaded Qwen3-Embedding-0.6B GGUF file.')
  }
  if (!LOOPBACK_HOSTS.has(input.host)) {
    throw new Error('The local embedding server must bind to a loopback address.')
  }
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65_535) {
    throw new Error('The local embedding server port is invalid.')
  }
  if (!input.model.trim()) throw new Error('The local embedding model identifier is required.')

  return [
    '--model', modelPath,
    '--embedding',
    '--pooling', 'last',
    '--embd-normalize', '2',
    '--host', input.host,
    '--port', String(input.port),
    '--alias', input.model,
    '--cors-origins', 'localhost',
    '--no-webui',
  ]
}

export function childEnvironment(): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(Bun.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export async function startEmbeddingSidecar(): Promise<Bun.Subprocess> {
  const modelPath = Bun.env.UNSLOTH_EMBEDDING_MODEL_PATH?.trim() ?? ''
  const host = Bun.env.KNOWLEDGE_EMBEDDING_HOST ?? '127.0.0.1'
  const port = Number(Bun.env.KNOWLEDGE_EMBEDDING_PORT ?? 8787)
  const model = Bun.env.KNOWLEDGE_EMBEDDING_MODEL ?? DEFAULT_MODEL
  const binary = Bun.env.KNOWLEDGE_EMBEDDING_SERVER_PATH ?? 'llama-server'
  const args = buildEmbeddingServerArgs({ modelPath, host, port, model })

  if (!(await Bun.file(modelPath).exists())) {
    throw new Error('The configured Qwen3 embedding GGUF file does not exist.')
  }

  const child = Bun.spawn([binary, ...args], {
    cwd: projectRoot,
    env: childEnvironment(),
    stderr: 'inherit',
    stdout: 'inherit',
  })

  const healthUrl = `http://${host === 'localhost' ? '127.0.0.1' : host}:${port}/health`
  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error('The local embedding server exited before becoming ready.')
    }
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1_000) })
      if (response.ok) {
        console.info(JSON.stringify({ event: 'knowledge.embedding.server.ready', model }))
        return child
      }
    } catch {
      // Model loading is intentionally reported only through the server's own stdout/stderr.
    }
    await Bun.sleep(500)
  }

  await stopEmbeddingSidecar(child)
  throw new Error('The local embedding model did not become ready within 180 seconds.')
}

export async function stopEmbeddingSidecar(child: Bun.Subprocess): Promise<void> {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  const stopped = await Promise.race([
    child.exited.then(() => true),
    Bun.sleep(5_000).then(() => false),
  ])
  if (!stopped) {
    child.kill('SIGKILL')
    await child.exited
  }
}
