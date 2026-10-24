# Two starters on one kernel, mirrored rather than forked

- **Category:** Architecture
- **Source ID:** last-cli-template-topology
- **URL:** https://www.lst97.dev/projects/last-cli
- **Visibility:** Public

The CLI offers two templates because there are two genuinely different starting conditions, not because a template matrix is useful. One product needs editors, a CMS, and an admin. The other is a business application or an API whose content is not editorial.

## The Payload template

`last-payload-tanstack-start-template` is Payload v4 on TanStack Start with RSC and Nitro. It boots a placeholder `/`, the Payload admin at `/admin`, and Payload's REST surface at `/api/*`. The collection surface is intentionally minimal: a `users` collection with auth, and a plain lexical editor. Everything else is an application decision.

The non-obvious parts are the ones that make the combination boot:

- `withPayloadRoot` hands the document to Payload on admin routes, so `data-theme`, `dir`, and `lang` rules match instead of leaving the admin shell unstyled.
- The admin bridge, import map, admin route, and not-found handling live under `src/lib/payload/`.
- The Postgres adapter runs with `push: false` and committed migrations, so a schema change is a reviewed file rather than a development auto-push.
- The Payload TanStack Vite plugins are vendored as the RSC-independent subset and re-copied after a Payload TanStack bump.
- A development-only `/ui` route exercises the installed shadcn components; production requests return 404.

The template explicitly excludes real auth beyond its users, extra collections, i18n, pagination UI, rate limiting, OpenAPI, email, storage, RAG, and chat.

## The blank template

`last-tanstack-start-template` is the CMS-free starter and the canonical owner of the backend kernel. It boots a placeholder `/`, `/api/live`, and `/api/ready`, plus the full shadcn registry, the shared Tailwind v4 tokens, the development-only `/ui` showcase, local Postgres through Compose, the smoke check, and CI.

There is no Payload, no `/admin`, and no collection layer. Auth is a `withAuth` stub returning 501, which is a deliberate seam for the application's own session model rather than a pretend auth system.

## The kernel both share

The shared `src/server/` tree is the reason the two templates do not drift into different architectures. It provides:

- A fixed `{ data }` / `{ error: { code, message } }` response envelope.
- A typed `HttpError` whose 5xx messages are hidden on the wire and logged instead.
- `withContext` for request IDs, structured logging, and never-throwing error mapping.
- Zod helpers for JSON bodies, query strings, and pagination, with one 400 shape.
- One Bun-native Postgres client and a Drizzle seam, with no per-module pools.
- A readiness probe that fails to 503 instead of pretending the database is healthy.
- Graceful shutdown on `SIGINT` and `SIGTERM`.
- A structured logger, security headers, Compose, smoke, and CI.

## The sync rule

The blank template is the source of truth. The Payload template mirrors the kernel file for file, with exactly three CMS-only differences:

- `src/server/env.ts` adds the Payload secret and public origin.
- `src/server/security/payload-server-url.ts` adds the production loopback guard.
- `src/plugins/payload-shutdown.ts` also drains cached Payload instances.

The mirror is maintained by a script driven by `scripts/kernel-sync.json`. CI runs it weekly and opens a pull request when the Payload copy has drifted. The direction matters: change the kernel in the blank template first, then let the sync update the Payload copy. Editing the Payload copy directly creates drift that the next sync will propose to undo.

That is the whole topology: one kernel, two boot surfaces, and a generator that pins both.
