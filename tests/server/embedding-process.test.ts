import { describe, expect, it } from 'bun:test'

import { buildEmbeddingServerArgs } from '../../scripts/embedding-process'

describe('buildEmbeddingServerArgs', () => {
  it('launches Qwen GGUF with embedding pooling and normalized OpenAI-compatible output', () => {
    expect(buildEmbeddingServerArgs({
      modelPath: '/models/qwen3-embedding.gguf',
      host: '127.0.0.1',
      port: 8787,
      model: 'Qwen/Qwen3-Embedding-0.6B',
    })).toEqual([
      '--model', '/models/qwen3-embedding.gguf',
      '--embedding',
      '--pooling', 'last',
      '--embd-normalize', '2',
      '--host', '127.0.0.1',
      '--port', '8787',
      '--alias', 'Qwen/Qwen3-Embedding-0.6B',
      '--cors-origins', 'localhost',
      '--no-webui',
    ])
  })

  it('refuses to bind the local model server beyond loopback', () => {
    expect(() => buildEmbeddingServerArgs({
      modelPath: '/models/qwen3-embedding.gguf',
      host: '0.0.0.0',
      port: 8787,
      model: 'Qwen/Qwen3-Embedding-0.6B',
    })).toThrow('must bind to a loopback address')
  })

  it('requires a GGUF model path', () => {
    expect(() => buildEmbeddingServerArgs({
      modelPath: '',
      host: '127.0.0.1',
      port: 8787,
      model: 'Qwen/Qwen3-Embedding-0.6B',
    })).toThrow('UNSLOTH_EMBEDDING_MODEL_PATH')
  })
})
