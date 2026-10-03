# How deployment, migrations and configuration are treated as architecture

- **Category:** Deployment & Operations
- **Source ID:** last-os-deployment-and-operations
- **URL:** https://www.lst97.dev/projects/last-os
- **Visibility:** Public

An application that is correct in development and misconfigured in production is not correct. Several values that look like environment plumbing are treated here as part of the design, because each one can make an otherwise sound deployment fail or become insecure.

**The public origin is build-time configuration.** `PUBLIC_SITE_URL` is baked into canonical URLs, Open Graph metadata, `sitemap.xml`, `robots.txt` and `security.txt`. Get it wrong and nothing looks broken — the site renders perfectly, links resolve internally, and search engines are handed a canonical address that points somewhere else. That is why the origin is validated as production-critical rather than left to a deploy variable nobody reviews.

**Payload's `serverURL` is a security property**, not a convenience field. Payload derives cookie and CORS behaviour from it, so the application validates the configured CMS origin and refuses a loopback address, an HTTP-only production URL, or an unparseable value. Failing at boot is the intended behaviour: booting quietly and serving with the wrong cookie policy is the worse outcome.

**Environment validation happens centrally and early.** Required credentials and origins are checked before critical infrastructure starts, rather than discovered on the first real user request. The difference is between a deploy that fails immediately with a specific message and a deploy that appears healthy until a visitor triggers the missing piece.

Migrations are committed files, not automatic pushes. Payload runs with automatic production pushes disabled, and each schema change is a named migration registered in one index, so the history is reviewable and the schema is deterministic. Development runs a migration check before the dev server starts, which exists to catch the specific failure of a collection field added in code without a corresponding migration — locally it works fine, and it only breaks on deploy.

The two deployment targets run migrations at deliberately different moments, and the difference is not an inconsistency.

**Vercel migrates during the deploy build.** The build generates Payload types, generates the admin import map, applies the migration, and only then builds the application — and if the migration fails, the deployment fails. On Vercel the build and the deploy are one unit, so this is safe: there is no window where an image exists and has not been migrated.

**Docker migrates at container startup.** An image can be built on Monday and first run on Thursday, so migrating only during the image build would leave the image stale by the time it boots. The container therefore applies migrations as it starts and then serves. The Dockerfile also deliberately mirrors the local build script rather than restating the chain, because a container that can skip a step the other builds run is exactly how a build starts passing locally and failing in production. And the two Payload CLI flags it needs — running Payload on the Bun runtime, and disabling tsx transpilation because Bun loads the TypeScript sources natively — are separate environment variables on purpose: one quoted variable lands in a single argument slot that bunx cannot split, which silently drops the flags rather than failing.

The container itself is a multi-stage Bun build: a dependency stage, a build stage, and a slim runner that installs production dependencies separately and runs as the non-root `bun` user. Health is checked against `/api/site/health`, and the check is performed by Bun itself rather than by `curl` or `wget`, which keeps those binaries out of the runtime image entirely.

Observability is bounded on purpose. Chat diagnostics are optional and off unless a restricted webhook is configured; when present they record the query, recent context, the final or partial reply, decision labels, retrieval candidates, provider-reported usage and limited server-derived visitor metadata. Delivery is asynchronous and cannot affect a chat result. What it never records is the interesting list: cookies, credentials, signed context tokens, contact form contents, or raw exceptions. The value of a diagnostics channel is that it can be trusted as a record, which stops the moment it becomes an unrestricted data sink.

One unresolved behaviour is documented rather than hidden. Branch preview deployments cannot currently complete a build, because Payload validates production-critical environment variables while generating types, and a preview environment has neither the database nor the Payload secret. The tempting fix is to make those variables optional so previews build — but that would convert a correct build-time failure into an incorrect runtime deployment, where the app starts and then misbehaves under a real user. The fix belongs in the deployment configuration, not in weakening the runtime requirement.

The pattern underneath all of it: production configuration is part of the architecture rather than documentation added after the code. Origin, database TLS, the CMS server URL, migration mode and secret storage all determine whether the deployed system is correct, so they are validated with the same care as the code paths they govern.