# Cloud Query and Local Index Embeddings

## Goal

Use SiliconFlow's Qwen3-Embedding-0.6B endpoint for chat-time query embeddings while keeping all knowledge document embedding and vector insertion on the local Unsloth-compatible endpoint.

## Design

The chat retrieval runtime will construct its existing OpenAI-compatible embedding client with a new typed `KNOWLEDGE_QUERY_EMBEDDING_URL`, defaulting to `https://api.siliconflow.cn/v1`, and the existing `SILICONFLOW_API_KEY`. It will continue using the shared `KNOWLEDGE_EMBEDDING_MODEL` value so query and indexed document vectors request the same model identifier. Existing query instruction-prefix behavior, timeout, response validation, and vector dimension validation remain unchanged.

Payload indexing and synchronization continue using `KNOWLEDGE_EMBEDDING_URL`, `KNOWLEDGE_EMBEDDING_API_KEY`, and `KNOWLEDGE_EMBEDDING_MODEL`; no provider switch is made in the index path. A small shared provider-config module maps each role to its settings, and tests exercise both mappings through the real embedding client.

## Security and Failure Behavior

The SiliconFlow API key remains server-only and is read from the existing environment configuration. It must not be logged or returned to clients. The user query text used for retrieval is sent to SiliconFlow for embedding. Existing sanitized provider errors and embedding response validation remain in force.

## Validation

- Environment tests cover the cloud query endpoint default, configured URL, and invalid URL rejection.
- Runtime wiring tests verify retrieval uses the cloud query endpoint and SiliconFlow key while indexing uses the local endpoint and local key.
- Existing embedding-client tests continue to cover request model/input, query instruction, timeout/error handling, and 1024-dimensional response validation.
- Run the focused environment, retrieval/provider tests and the project's full test/typecheck commands.

## Compatibility

Both pathways use `Qwen/Qwen3-Embedding-0.6B` and the existing 1024-dimension contract. No schema migration or re-index is planned. If provider output dimensions or model compatibility do not satisfy that contract, the embedding client should fail validation rather than insert/search incompatible vectors.
