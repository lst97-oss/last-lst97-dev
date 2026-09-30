# LAST//OS

Personal operating system for **SIO TOU LAI (Nelson, @lst97)** — a desktop-styled portfolio site with a
source-grounded chat assistant and a Payload CMS admin for editorial content.

Live site: <https://www.lst97.dev> · Repository: <https://github.com/lst97-oss/last-lst97-dev-web> · License: [MIT](LICENSE)

## What it is

One Bun application with three runtime surfaces:

| Surface | Path | Purpose |
| --- | --- | --- |
| Public site | `src/routes/_site.*.tsx`, `src/components/site/` | Portfolio, blog, changelog, chat, contact — presented as a desktop OS shell |
| Payload admin | `src/routes/_payload*.tsx` | CMS for posts, projects, changelogs, media at `/_payload/admin` |
| Server domain | `src/server/**` | Chat agent, RAG retrieval, WakaTime, contact/email, SEO, moderation, security |

Content lives in **two** Postgres databases. `DATABASE_URL` is Payload's own database (editorial content,
users, rate limits, contact approvals). `KNOWLEDGE_DATABASE_URL` is a dedicated pgvector database holding
the retrieval index and the WakaTime heartbeat warehouse. They are deliberately separate.

## Stack

- **Runtime / package manager:** Bun 1.4.1 (`bun.lock`, `bun test`, `bunx --bun`). No `engines` or `packageManager` field exists.
- **Framework:** TanStack Start 1.168 with RSC enabled, React 19, TanStack Router (file routes), Vite 8, Nitro 3.
- **CMS:** Payload CMS v4 canary (`4.0.0-canary.35`) on `@payloadcms/db-postgres`, with `@payloadcms/tanstack-start@4.0.0-canary.35`.
- **UI:** Tailwind CSS v4, 61 shadcn-style wrappers over Base UI primitives, lucide-react icons.
- **AI:** OpenRouter (planner + responder), TypeSafe `Jev` (decision model), SiliconFlow (reranking + query embeddings), local `llama-server` (document embeddings).
- **Quality:** Bun test (109 test files), Biome 2.5.14, TypeScript 6.

## Quick start

```sh
bun install
cp .env.example .env      # fill in PAYLOAD_SECRET, DATABASE_URL, and the provider keys you need
bun run build             # regenerates payload-types.ts + payload-import-map.ts, then vite build
bun run dev               # http://localhost:3000
```

The admin at `/_payload/admin` needs a committed migration applied first (`bun run db:migrate`) and at
least one `users` row. Both `payload-types.ts` and `src/payload-import-map.ts` are gitignored, so a fresh
clone cannot boot the admin until `bun run build` (or the two `generate:*` scripts) has run.

Everything in the RAG stack is **opt-in**. With `KNOWLEDGE_RAG_ENABLED=false` (the default) you need no
model file, no `llama-server`, and no SiliconFlow key — the site and ordinary chat work as-is.

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server on port 3000 |
| `bun run dev:rag` | Dev server plus a local `llama-server` embedding sidecar |
| `bun run build` | `payload generate:types` → `generate:importmap` → `vite build` |
| `bun run test` | Full `bun test` suite |
| `bun run typecheck` | `tsc --noEmit` — the only static check that sees `tests/**` |
| `bun run db:migrate` | Apply committed Payload migrations |
| `bun run worker` | Payload jobs worker for the `knowledge` queue |
| `bun run check:server` / `lint:server` / `format:server` | Biome over `src/server` only |

RAG and content-corpora maintenance: `knowledge:migrate`, `knowledge:sync`, `knowledge:github:sync`,
`knowledge:github:reindex`, `knowledge:github:catalog`, `knowledge:interview:index`, `wakatime:import`,
`embedding:serve`, `embedding:test`.

**Build output is not `dist/`.** Fresh Vite output goes to `.vercel/output/` under the default
`NITRO_PRESET=vercel`, or `.output/` when the Dockerfile sets `NITRO_PRESET=node-server`. The `dist/`
directory is a stale artifact from an earlier config revision, which also makes the `bun run start`
script (`bun ./dist/server/server.js`) a dead path against a current build.

## Chat assistant

The chat is an agentic loop over five read-only tools, defined as a single tuple in
`src/server/chat/types.ts`:

- `search_knowledge` — RAG over the indexed corpora (Payload posts/projects, the operator profile, the public WakaTime share, GitHub repository and contribution reports, and the interview Q&A corpus)
- `list_owned_projects` — structured catalogue from `knowledge_projects`, with filter-aware totals
- `coding_stats` — public WakaTime share aggregates
- `coding_history` — the imported heartbeat warehouse (per-project totals, daily series, streaks)
- `site_content` — currently published Payload posts, projects, changelogs, and topics

`Jev` decides which sources a turn needs; an OpenRouter planner prepares tool arguments for only the
approved tools; a separate OpenRouter responder writes the answer in Nelson's first person. Retrieval
searches 10 vector candidates, reranks to 10, gates the top 3 through a Jev relevance check, and injects
surviving evidence wrapped as untrusted data.

Full architecture, tool contracts, and change checklist: [`src/server/chat/AGENTS.md`](src/server/chat/AGENTS.md).

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/knowledge-rag.md`](docs/knowledge-rag.md) | RAG setup, retrieval pipeline, WakaTime tools, owned-project catalogue |
| [`docs/wakatime-history.md`](docs/wakatime-history.md) | Heartbeat warehouse schema, rollups, privacy |
| [`docs/security/vercel-ingress.md`](docs/security/vercel-ingress.md) | Vercel ingress and client-IP trust |
| [`CONTEXT.md`](CONTEXT.md) | Ubiquitous language for content domains |
| [`src/server/knowledge/AGENTS.md`](src/server/knowledge/AGENTS.md) | RAG module invariants and conventions |
| [`src/server/chat/AGENTS.md`](src/server/chat/AGENTS.md) | Chat architecture and model responsibilities |
| [`docs/superpowers/`](docs/superpowers) | Dated design specs and plans (historical record, not a task list) |

Checkbox state in `docs/superpowers/plans/**` is **not** a completion signal — several shipped plans
still have every box unticked. Treat the code and the per-directory `AGENTS.md` files as authoritative.

## Deployment

Vercel is the production target (`nitro` preset `vercel`, runtime `bun1.x`). A Docker image is also
provided: four stages on `oven/bun:1.4.1-slim`, non-root `bun` user, port 3000, a healthcheck against
`/api/site/health`, and an entrypoint that runs `payload migrate` before serving unless `SKIP_MIGRATIONS=true`.

`PUBLIC_SITE_URL` must be the real public origin in production — canonical links, `og:url`,
`sitemap.xml`, `robots.txt` and `security.txt` are all baked from it at build time via the
`__LAST_OS_SITE_URL__` define.

### Preview builds do not work

`bun run build` starts with `payload generate:types`, which loads `payload.config.ts`, which calls
`getServerEnv()` at module scope. That validates the whole server schema and requires `DATABASE_URL`
and `PAYLOAD_SECRET`. A Preview environment has neither, so every PR preview fails at
`Environment validation failed: DATABASE_URL: Invalid input: expected string, received undefined`.

The failure is unrelated to the PR being tested — it is a property of the build. Only `main` deploys,
via the `Production` deploy hook scoped to `ref: main`. To preview a branch, run the app locally.

Preview builds have **not** been disabled. The GitHub App builds a Preview for every non-`main` push
and each one fails this way. Two things that look like fixes and are not:

- `vercel.json` has no `gitDeploymentEnabled` key. Adding one fails the schema check outright and
  takes Production down with it — `Invalid vercel.json - should NOT have additional property`.
- `gitProviderOptions.createDeployments: disabled` via the project API returns HTTP 200 but does not
  stop the GitHub App; a `git-dev` Preview is still created afterwards.

Disabling previews needs either the Vercel dashboard's branch-ignore setting or unlinking the Git
integration and deploying `main` through the CLI or the deploy hook. That is a project-settings
decision, not a code one, so nothing in the repo attempts it.

Do not "fix" this by making `DATABASE_URL` or `PAYLOAD_SECRET` optional. Both are load-bearing at
runtime, and relaxing them trades a build-time failure for a deploy-time one.

### Secret storage

Store `PAYLOAD_SECRET` as an encrypted **Secret**, not a plaintext **Config** value. Config values are
readable by anyone with project access. Note that Vercel will not return the value of a Config var —
the API yields a ciphertext blob and `vercel env pull` writes `[SENSITIVE]` placeholders — so a secret
mistakenly stored as Config cannot be recovered once written; rotate it instead.

## Contributing

Run `bun run typecheck` and `bun test` before opening a pull request. See [`AGENTS.md`](AGENTS.md) for the
architecture map, code conventions, and the verification traps that produce confidently wrong results in
this repo.

## License

MIT © 2026 SIO TOU LAI — see [LICENSE](LICENSE).
