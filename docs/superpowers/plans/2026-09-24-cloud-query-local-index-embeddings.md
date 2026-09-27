# Cloud Query / Local Index Embeddings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route chat query embeddings through SiliconFlow while preserving local Unsloth embeddings for every knowledge indexing/insertion operation.

**Architecture:** Add a typed cloud query URL setting with SiliconFlow as its default. Chat retrieval will use this URL and the existing SiliconFlow credential while sharing the existing model ID; Payload knowledge indexing remains wired to the local URL and local credential.

**Tech Stack:** Bun, TypeScript, T3 Env (`@t3-oss/env-core`), Zod, existing OpenAI-compatible embedding client, Bun test.

**Spec:** `docs/superpowers/specs/2026-09-24-cloud-query-local-index-embeddings-design.md`

## Global Constraints

- Keep the shared model ID at `Qwen/Qwen3-Embedding-0.6B` unless explicitly configured through the existing `KNOWLEDGE_EMBEDDING_MODEL` setting.
- Use SiliconFlow for chat query embeddings only.
- Keep Payload document embedding and vector insertion on `KNOWLEDGE_EMBEDDING_URL` with `KNOWLEDGE_EMBEDDING_API_KEY`.
- Never expose or log `SILICONFLOW_API_KEY`.
- Preserve the existing query instruction and 1024-dimension response validation.

## Review Focus

- Missing SiliconFlow key when RAG retrieval runs: existing required-env behavior should fail without exposing the key.
- Invalid query endpoint URL: T3 Env validation should reject it.
- Provider wiring drift: tests should prove retrieval and indexing use their intended URLs/credentials.
- Model mismatch: both pathways must continue using the same shared model setting.
- Invalid cloud vector size: existing embedding-client checks must reject it before pgvector search.

---

### Task 1: Configure cloud query embeddings without changing local indexing

**Files:**
- Modify: `src/server/env-schema.ts`
- Modify: `src/server/env.ts`
- Modify: `.env.example`
- Modify: `src/server/chat/runtime.ts`
- Modify: `src/server/knowledge/payload-runtime.ts`
- Create: `src/server/knowledge/embedding-provider-config.ts`
- Test: `tests/server/env.test.ts`
- Test: `tests/server/embedding-provider-config.test.ts`
- Test: `tests/server/knowledge-providers.test.ts`

**Interfaces:**
- Add `KNOWLEDGE_QUERY_EMBEDDING_URL` to `ServerEnvSource`; validate as a URL and default to `https://api.siliconflow.cn/v1`.
- Chat retrieval's `createEmbeddingClient` consumes `KNOWLEDGE_QUERY_EMBEDDING_URL`, `KNOWLEDGE_EMBEDDING_MODEL`, `requiredServerEnv('SILICONFLOW_API_KEY')`, and the existing embedding timeout.
- Index creation and sync continue consuming `KNOWLEDGE_EMBEDDING_URL`, `KNOWLEDGE_EMBEDDING_MODEL`, `KNOWLEDGE_EMBEDDING_API_KEY`, and the existing timeout.

- [x] **Step 1: Write failing environment tests**

Add assertions in `tests/server/env.test.ts` that the cloud query endpoint defaults to `https://api.siliconflow.cn/v1`, accepts an explicitly configured valid URL, and rejects an invalid URL with an error naming `KNOWLEDGE_QUERY_EMBEDDING_URL`.

- [x] **Step 2: Run environment tests and confirm the expected failure**

Run: `bun test tests/server/env.test.ts`
Expected: FAIL because the new environment variable is not yet part of the T3 Env schema/source.

- [x] **Step 3: Add the typed setting and update chat provider wiring**

Add the new key to the source type, schema, strict runtime mapping in `src/server/env-schema.ts`, and runtime source mapping in `src/server/env.ts`. Document the endpoint in `.env.example`. Change only the chat runtime embedding client to use the new URL and `requiredServerEnv('SILICONFLOW_API_KEY')`. Leave `src/server/knowledge/payload-runtime.ts` unchanged.

- [x] **Step 4: Add and run provider-boundary tests**

Add runtime provider-config tests that exercise chat-query and document-index configs through the real embedding client, asserting cloud endpoint/credential for queries and local endpoint/credential for document vectors. Wire both runtime paths through their respective config selectors. Run: `bun test tests/server/env.test.ts tests/server/embedding-provider-config.test.ts tests/server/knowledge-providers.test.ts tests/server/knowledge-retrieval.test.ts`.

Expected: all focused tests PASS; the embedding client continues enforcing the 1024-dimensional response contract.

- [x] **Step 5: Run full verification**

Run the repository's test and typecheck scripts from `package.json`. Expected: both PASS; report any pre-existing failures distinctly.
