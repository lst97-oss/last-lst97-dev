# Repository Guidelines

## Project Overview & Module Structure

**LAST//OS** is a single Bun application serving three surfaces: a desktop-styled public portfolio site, a
Payload CMS admin at `/_payload/admin`, and a server domain layer (`src/server/**`) that is route-free.
The package name is `last-lst97-dev-web`; the product name is `LAST//OS` (`SITE_NAME` in
`src/lib/seo/site-seo.ts`). The operator is Nelson (GitHub `LST97`); the chat persona speaks as him in
first person.

```
src/routes/          TanStack file routes. _site.* = public pages, _payload.* = admin,
                     api.$.ts = Payload REST, api.site.{chat,contact,health}.ts = app endpoints.
src/server/          Server domain layer, grouped by bounded context:
                     chat, knowledge, moderation, content, wakatime, contact, email, seo,
                     security, observability, http, storage, env.ts, env-schema.ts.
src/components/site/ Site components (shell, chat, contact, content, home, window, battle).
src/components/ui/   61 shadcn-style wrappers over Base UI primitives. Generated-style code.
src/lib/             Client-safe shared code: os-store, chat limits, SEO, Payload admin bridge.
src/collections/     Payload collections + fields/ + access.ts.
src/migrations/      Committed Payload migrations (7 registered in index.ts).
src/data/            Content corpora (168 .md): interview/, github/{public,private,contributions/public}/, profile.md.
src/styles/          14 CSS partials imported by the src/styles.css entry.
src/integrations/    TanStack Query provider wiring.
vendor/              Vendored Payload TanStack Vite plugins + two module shims. See below.
scripts/             12 CLI scripts; 10 wired to package.json scripts.
tests/               109 test files (38 flat + 71 under tests/server/), plus
                     tests/site-stylesheet.ts, the shared CSS loader.
docs/                Operational docs, research, and dated superpowers specs/plans.
```

## Architecture & Data Flow

**Server-only boundary.** Enforced by TanStack Start's `importProtection` option in `vite.config.ts`
(`client.specifiers`, `ignoreImporters`, `include`, `mockAccess`, `onViolation`). The specifier list lives
in `vendor/payload-tanstack-vite/importProtection.js` as `serverOnlyClientSpecifiers`. Do not add a
second mechanism.

**Composition pattern.** Each `src/server/<context>/` exposes a memoized singleton in that context's
`runtime.ts` (`getChatService()`, `getModerationService()`, `contentReader`, `wakaTimeReader`,
`submitContact`) and, where the browser needs it, thin
`createServerFn({ method: 'GET', strict: false })` wrappers in a sibling `server-functions.ts`. Routes
import the wrappers, never the module behind them.

**Vite plugin order is load-bearing** (`vite.config.ts:97-132`): `tailwindcss` → the five vendored
Payload plugins → `viteRsc({ serverHandler: false })` → `reactStartRscVitePlugin()` →
`tanstackStart({ rsc: { enabled: true } })` → `viteReact` → `nitro({ preset: process.env.NITRO_PRESET ?? 'vercel' })`.
`serverHandler: false` is required: the default handler races Start's entry and 500s every request with
"Invalid server handler entry". `vendor/payload-tanstack-vite/README.md` is the authoritative record of
why the wrapper plugin is not used; re-copy that directory after any `@payloadcms/tanstack-start` bump.

**Chat request flow.** `src/routes/api.site.chat.ts` → `src/server/chat/http-handler.ts` (zod validation,
rate limit, Turnstile) → `src/server/chat/turn-preparation.ts` (signed context, turn limits, moderation)
→ `src/server/chat/agent/agent-loop.ts` (up to `MAX_AGENT_STEPS = 4`) →
`src/server/chat/tools/agent-tool-runner.ts` (fixed zod schemas, timeouts, bounded output) →
`src/server/chat/openrouter-responder.ts` (streamed answer) → SSE. The tool tuple `CHAT_TOOL_NAMES` in
`src/server/chat/types.ts` is the single source of truth: `search_knowledge`, `list_owned_projects`,
`coding_stats`, `coding_history`, `site_content`. SSE frames are `event: <type>\ndata: <json>\n\n` via
`encodeChatEvent` in `src/server/chat/events.ts`; the browser shares that module, so it must stay free
of server imports.

**RAG flow.** Retrieval: `src/server/knowledge/retrieve.ts` (`RetrieveKnowledge.execute`) is the only
entry chat calls — pgvector search (10 candidates) → SiliconFlow rerank →
`src/server/knowledge/jev-relevance-gate.ts` → evidence budget → `src/server/knowledge/prompt-evidence.ts`
(untrusted wrapper). Indexing: `*-source.ts` → `chunking` → `index-source` →
`repository.upsertSourceChunks`, driven by Payload hooks/tasks and the CLI scripts. Chunk dedupe is by
source identity `type:sourceId`, never by chunk id. RAG is opt-in via `KNOWLEDGE_RAG_ENABLED` and
degrades to a normal reply rather than blocking.

**Databases.** `DATABASE_URL` (Payload) and `KNOWLEDGE_DATABASE_URL` (pgvector + WakaTime warehouse) are
separate by design. `postgresAdapter` runs with `push: false` and `prodMigrations: migrations` — schema
changes go through committed migrations in `src/migrations/`, each a `YYYYMMDD_HHMMSS_snake_case` `.ts`
exporting `up`/`down` plus a sibling `.json` snapshot, registered by name in `src/migrations/index.ts`.

## Development Commands

| Command | Purpose |
| --- | --- |
| `bun install` | Install (Bun is the only supported package manager) |
| `bun run dev` | `bunx --bun vite dev --port 3000` |
| `bun run dev:rag` | Dev server + `llama-server` embedding sidecar (kills both on signal) |
| `bun run build` | `generate:payload-admin-css` → `generate:types` → `generate:importmap` → `vite build`. The Dockerfile calls this same script; see the flags below. |
| `bun run test` | `bun test` — the whole suite |
| `bun run typecheck` | `tsc --noEmit` — the only static check that covers `tests/**` |
| `bun run db:migrate` | `bunx payload migrate` |
| `bun run worker` | Payload jobs worker (`knowledge` queue) |
| `bun run generate-routes` | `tsr generate`; regenerates `src/routeTree.gen.ts` |
| `bun run check:server` | Biome formatter + linter + import assist over `src/server` |
| `bun run lint:server` / `format:server` | Biome linter / formatter over `src/server` |
| `bun run imports:check` / `imports:organize` | Import ordering over `src/server src/components src/routes` |
| `bun run embedding:serve` / `embedding:test` | Standalone sidecar / its two test files |

RAG maintenance scripts: `knowledge:migrate`, `knowledge:sync`, `knowledge:github:sync`,
`knowledge:github:reindex`, `knowledge:github:catalog`, `knowledge:interview:index`, `wakatime:import`.
`scripts/embedding-process.ts` is a library (no npm script); `scripts/evaluate-jev-tool-routing.ts` is run
ad hoc as `bun scripts/evaluate-jev-tool-routing.ts`.

**The container build is the only caller that sets `PAYLOAD_BUNX_FLAGS` / `PAYLOAD_CLI_ARGS`.** The
Dockerfile calls `bun run build` instead of repeating the chain, so the image cannot skip a step the
local and Vercel builds run. Locally both variables are unset and the Payload CLI runs under Node.
The container passes `--bun` (Payload must run on the Bun runtime) and `--disable-transpile` (tsx's
`tsx://` loader cannot resolve under Bun, so Bun loads the TypeScript sources natively). They are
**separate** variables on purpose: one quoted variable lands in a single argv slot that bunx cannot
split, which silently drops the flags.

**`docker build` currently fails, and it is not this script's fault.** `resolvePayloadServerUrl`
(`src/server/security/payload-server-url.ts:57`) rejects a loopback origin when `NODE_ENV=production`,
and the build stage sets `NODE_ENV=production` at the `base` image while `DATABASE_URL` points at
`localhost`. `generate:types` loads `payload.config.ts`, so the guard fires. Verified pre-existing:
the Dockerfile at `0838098` fails with the identical `PayloadServerUrlError`. Fixing it means giving
the build stage a non-loopback `PAYLOAD_PUBLIC_SERVER_URL` (it is compile-time only and never
reaches the image), not relaxing the guard.

## Code Conventions & Testing Patterns

**Runtime is Bun.** App code uses `Bun.env` and Web APIs. `node:path`/`node:url` appear only in config
files, where a comment says why.

**Import aliases:** use `@/…` (225 call sites in `src/`). The `#/*` subpath import is declared in both
`package.json` and `tsconfig.json` but has **zero** usages — do not add new ones.

**Style (Biome, `src/server` only):** 2-space indent, 120 columns, single quotes, double quotes in JSX,
semicolons omitted, trailing commas. Files outside `src/server`, `src/components`, `src/routes` are not
formatted or linted by any script — match surrounding style by hand.

**Server module conventions** (from `src/server/knowledge/AGENTS.md`): constructor-inject every external
dependency with a default (`fetcher = fetch`, `now`, `embedding`); ports plus `Pick<…>` dependency objects
rather than classes; validate at the boundary with zod, then trust the parsed value; `MAX_*` named
constants near the top; durations named `timeoutMs`; timing logs as
`durationMs: Math.max(0, Math.round(now() - startedAt))`; throw fixed, sanitized messages.

**Tests:** 109 files under `tests/` (27 `.ts` + 11 `.tsx` at the root, 71 in `tests/server/`), never
co-located with source. Filename mirrors the module basename; a module at `src/server/knowledge/foo.ts`
is tested by `tests/server/foo.test.ts`. Fakes are **ports, not module mocks** — `mock.module` is used
zero times. The house fakes to copy are `scriptedPlanner` / `baseDependencies` / `streamingResponder`
(`tests/server/chat-service.test.ts`), `createDatabase(rows)` with `new PgDialect()`
(`tests/server/knowledge-repository.test.ts`), and per-file `createDependencies` / `harness` /
`createLogger` builders. HTTP is faked by injecting a `fetch`-shaped function; process spawning by
injecting a `GithubCommandRunner`.

**Style tests must use `tests/site-stylesheet.ts`.** `src/styles.css` is only an `@layer` declaration plus
14 `@import` statements, and happy-dom does not resolve `@import` — inlining it alone yields zero
`cssRules`, so assertions fail or pass *vacuously*. Use `loadSiteStylesheet()` / `createSiteStyleWindow()`.
happy-dom also leaves `var()` unresolved (assert the declaration, not the computed value) and authored
selectors wrap across lines (collapse whitespace when matching `selectorText`).

**Do not edit:** `src/routeTree.gen.ts` (generated), `payload-types.ts` and `src/payload-import-map.ts`
(generated, gitignored), or `src/data/**` by hand — those corpora are written by
`knowledge:github:sync` / `knowledge:interview:index` / `scripts/sync-github-knowledge.ts`.

## Critical Workflows & Verification Traps

These produce *confidently wrong* results rather than obvious errors. Each has been hit in this repo.

- **Never read an exit code off a pipeline.** `bunx tsc --noEmit 2>&1 | tail -3; echo $?` reports `tail`'s
  status. Capture first, read second: `bunx tsc --noEmit >/tmp/tsc.txt 2>&1; echo $?`, or use
  `${PIPESTATUS[0]}`. Same for `bun test … | grep …`, where `grep` exits 1 on "no matches".
- **Build output is not `dist/`.** Fresh output is `.vercel/output/` (default preset) or `.output/`
  (`NITRO_PRESET=node-server`). `dist/` is stale from an earlier config revision, which also makes
  `bun run start` a dead path. Never grep `dist/` for compiled CSS.
- **A green test run is not pgvector coverage.** Two integration blocks stay skipped unless
  `KNOWLEDGE_TEST_DATABASE_URL` is exported. That variable is absent from `.env.example`; it is
  documented at `docs/knowledge-rag.md`.
- **Sanity-check narrow counts against the plain total** for the same scope before concluding anything
  from them.
- **Prove a negative-path verification reached the branch.** A `removedCount: 0` result is identical
  whether cleanup ran correctly or the setup step silently threw. Use a positive control, and note that
  `pg` needs `$1` placeholders — `%s` is client-side printf and throws at runtime, not at typecheck.
- **Some tests pin exact prompt wording.** `tests/server/typesafe-classifier.test.ts`,
  `tests/server/openrouter-knowledge-prompt.test.ts`, and `tests/server/agent-planner.test.ts` assert
  `toContain` substrings of prompt text and will fail on a benign reword. Re-pin to the substring
  expressing the new intent; never delete the assertion and never loosen it so the old text also passes.
- **Establish a baseline before blaming your change.** When the tree carries unrelated uncommitted work,
  stash (including `-u`), run the suite, and diff normalized test names before concluding you broke
  something. Per-test timing suffixes differ between runs and make every test look new.
- **BOXES IN `docs/superpowers/plans/**` ARE NOT A COMPLETION SIGNAL.** Several shipped plans still have
  every checkbox unticked. The code and the per-directory `AGENTS.md` files are authoritative; those docs
  are a historical record. Known-stale: the `.cn` SiliconFlow host in the 2026-09-24 embeddings
  spec/plan (code uses `https://api.siliconflow.com/v1`), and the 12-message/60,000-char transcript caps
  in the 2026-09-24 multiturn spec/plan (code uses `MAX_CHAT_TURNS = 20`,
  `MAX_CHAT_CONTEXT_MESSAGES = 40`).

## Git & Commit Conventions

Conventional Commits are the established style: `type(scope): imperative summary`, e.g.
`feat(chat): add project counts and improve catalog routing`, `fix(styles): correct malformed CSS
comment`, `chore(knowledge): update contribution report counts`. Observed types: `feat` (13), `chore` (6),
`refactor` (5), `docs` (5), `fix` (4), `test` (3). Every recent commit follows the convention; match it.

Branch flow is `dev` → `main`: land work on `dev`, merge to `main`. Never commit `.env`, `.env.local`,
or `.vercel/` (all gitignored). **`src/data/github/private/` is intentionally tracked** — those are
sanitized summaries, not source, gated by `assertSafeGithubMarkdown` and scanned by
`tests/server/github-content-safety.test.ts`. Do not gitignore it, do not add a public-only SQL filter,
and do not re-wire the unwired `src/server/knowledge/github/source.ts`.

## Security & Configuration Tips

- Copy `.env.example` to `.env` and keep credentials there or in the deployment secret store. Never print
  values from `.env` or `.env.local`.
- `PUBLIC_SITE_URL` must be the real public origin in production; meta tags, canonical links, `og:url`,
  `sitemap.xml`, `robots.txt`, and `security.txt` are all baked from it at build time.
- `OPENROUTER_SYSTEM_PROMPT` is declared in `.env.example` and `src/server/env-schema.ts` but is
  **missing from the allowlist** in `src/server/env.ts`'s `readRuntimeEnv()`, so
  `src/server/chat/openrouter-responder.ts` always falls back to `DEFAULT_SYSTEM_PROMPT`. Setting it has
  no effect today.
- `CLOUDFLARE_R2_API_TOKEN` exists in local `.env` but is referenced by no code and no schema. It is dead
  config, not a requirement.
- Turnstile tokens are single-use control data: never pass them into a model, signed context, or
  diagnostics.
- `src/data/github/private/` ships inside the Docker image (`.dockerignore` does not exclude `src/data`).
  Review before publishing to a new audience.
- `KNOWLEDGE_RAG_ENABLED` defaults to `false`. Leave it off unless you are working on retrieval.

## Important Files

| File | Why it matters |
| --- | --- |
| `vite.config.ts` | Plugin order, aliases, `__LAST_OS_SITE_URL__` define, Nitro preset. Starts with `// @ts-nocheck` by design. |
| `vendor/payload-tanstack-vite/README.md` | Why the Vite plugins are vendored and when to re-copy them |
| `payload.config.ts` | Adapter, collections, `importMapFile`, jobs, conditional email/storage |
| `src/server/env-schema.ts` | The zod env contract and every default |
| `src/server/chat/types.ts` | `CHAT_TOOL_NAMES`, `ChatWorkflowContext`, `MAX_CHAT_TURNS` neighbours |
| `src/server/chat/events.ts` | The SSE wire protocol, shared with the browser |
| `src/server/knowledge/AGENTS.md` | RAG invariants, dedupe rules, "do not fix without a request" list |
| `src/server/chat/AGENTS.md` | Chat module map, model responsibilities, contact workflow, change checklist |
| `src/styles.css` | Cascade-layer order plus the partial import list |
| `tests/site-stylesheet.ts` | The only correct way to load site CSS in a test |
| `biome.json` | Shows exactly which paths get formatted, linted, and import-sorted |
| `doctor.config.ts` | 8 per-file `react-doctor` suppressions, each with a written justification. `react-doctor` is not a devDependency; run it on demand with `npx -y react-doctor@latest` (a root scan is authoritative, `npx react-doctor src` hides findings in build output). `bunx --bun react-doctor` crashes on this machine — use `npx`. |

## Subdirectory AGENTS.md

Two per-directory files exist and own their subsystems. Read them before editing those areas; do not
duplicate their content here.

- `src/server/knowledge/AGENTS.md` — RAG module: pipeline position, invariants, conventions, and an
  explicit "do not fix without a change request" list (unwired `github/source.ts`, the
  public-only vs `allowPrivate` split, worker caps, tracked private summaries).
- `src/server/chat/AGENTS.md` — chat and moderation: module map, Jev/planner/responder responsibilities,
  request flow, contact state machine, source boundaries, diagnostics, change checklist.
