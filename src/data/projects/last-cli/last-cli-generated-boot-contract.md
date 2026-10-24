# What a generated project can already prove before the first feature

- **Category:** Deployment & Operations
- **Source ID:** last-cli-generated-boot-contract
- **URL:** https://www.lst97.dev/projects/last-cli
- **Visibility:** Public

A starter is only useful if the project it produces can boot, prove it booted, and keep proving it in CI. Both LAST templates are built around that contract rather than around a file tree that looks complete.

## The inherited contract

Every generated project starts with the same plumbing:

- A single response envelope and a typed error type, so a client never has to guess the failure shape.
- Request-scoped context with a request ID, structured logs, and error mapping that cannot throw while handling an error.
- Boundary validation with zod: bodies, query strings, and pagination each have one parser and one 400 shape.
- One Bun-native Postgres client with a Drizzle seam. Business modules reuse it instead of opening their own pools.
- Liveness at `/api/live`, which performs no I/O and therefore cannot kill a container when the database is down.
- Readiness at `/api/ready`, which probes the database and returns 503 with a report when degraded.
- Security headers, graceful shutdown, a multi-stage Dockerfile, and a Compose file for local Postgres.
- A smoke script that checks the running server, not just the build output.
- CI that runs formatting, linting, type checking, migrations, tests, a production build, and the smoke check against the built server.
- TanStack Query, Form, and Store wired once; Tailwind v4 semantic tokens; shadcn `base-nova` components; a theme provider; and site error and not-found boundaries.
- One pinned Bun version, `bun fmt`, Biome for lint and import order, and `bun check` for types.

## The boot sequence

The CLI does not run any of this. It prints the path, and the template README repeats it:

- `cd my-app`
- Edit `.env`.
- `bun run db:up`
- `bun run db:migrate`
- `bun run generate:types` and `bun run generate:importmap` (Payload template only)
- `bun run generate-routes`
- `bun run dev`

The blank template skips the two Payload generation commands. The Payload template additionally needs `bunx payload create-first-user` before `/admin` has an account to sign in with. Docker is optional: any Postgres matching `.env` works.

## The smoke check is the point

The smoke script is not a ping. It asserts the boot contract against a running server:

- `/` returns 200.
- `/admin` returns 200 or a redirect, when the template has an admin.
- `/api/users/me` returns 200 with `{"user":null}`, when the template has Payload users.
- `/api/live` returns 200 with a `live` status.
- `/api/ready` returns 200 or 503, and the body carries an `ok` or `degraded` report.

Those checks catch the failures that a build cannot: a route tree that did not regenerate, an admin bridge that 500s on first request, a database probe wired to the wrong client, or an environment guard that rejects the configured origin. CI runs the same checks against the built node-server output, so the build and the running process are proven together.

## Why the contract lives in the starter

Every one of these decisions is easy to make once and expensive to re-litigate in every project. Putting them in the starter means the first commit of a new application is about the product, while the boot path, the error shape, and the deployment checks are already known-good. The template is not a scaffold to be replaced; it is the baseline that the application extends.
