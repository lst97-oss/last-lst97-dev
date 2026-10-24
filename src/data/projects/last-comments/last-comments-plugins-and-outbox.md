# Plugins are compiled in, and their events leave through an outbox

- **Category:** Background Processing
- **Source ID:** last-comments-plugins-and-outbox
- **URL:** https://www.lst97.dev/projects/last-comments
- **Visibility:** Public

The plugin system is deliberately not a runtime extension marketplace. Plugins are trusted server-side TypeScript modules, imported statically in `src/server/plugins/config.ts`. Installing an npm package does not activate it, and the host never downloads code at runtime. Activation is a code review, because a plugin runs with the application's privileges.

## The capability surface

A plugin declares a small, fixed set of hooks:

- `validateComment` runs in order with a five-second timeout. A failure rejects the write. This is where Turnstile lives.
- `beforeOperation` wraps the public create, edit, delete, and vote boundaries. This is where the rate limiter lives, because it needs the operation and the request, not just the body.
- `screenComment` returns an advisory `allow` or `hide` verdict. Screening never throws the write away; a `hide` verdict persists the row with `status: 'hidden'`.
- `events` plus `handleEvent` subscribe to domain events. Delivery goes through the transactional outbox.
- `migrations` provide DDL for the plugin's own tables. They run only for installed plugins, through the business migration script, never at application startup.

The three installed plugins are Turnstile, rate limiting, and the content filter. The filter is the worked example of the event and migration halves: it has its own tables and settings, and it can hide a comment without rejecting the write.

## The outbox

An event is written in the same database transaction as the comment it describes. A plugin that crashes between the comment insert and the event insert cannot lose the event, because there is no window between them: either both rows commit or neither does.

A worker claims due deliveries with a lease, then runs the subscriber's `handleEvent` with a 30-second timeout. Delivery is retried with exponential backoff and capped delay; after eight attempts the delivery becomes `dead_letter` rather than retrying forever. A missing plugin registration also dead-letters immediately, because retrying cannot install code that is no longer in the image.

Handlers must be idempotent: the outbox guarantees at-least-once delivery, not exactly-once execution. The event carries a stable id, type, aggregate id, API version, occurrence time, and payload, so a handler can deduplicate on the id.

## Running it

The worker is a separate process: `bun run plugins:work` locally, or the Compose `worker` service in a deployment. Migrations for installed plugins run through `bun run db:business:migrate`. Uninstalling a plugin is explicit — removing it from the installed list stops new work, and a separate script drops its tables and migration history when the data is no longer wanted.

The design trade is stated plainly: no sandbox, no hot loading, no third-party code at runtime. In exchange, a plugin is ordinary application code that can be typed, reviewed, tested, and reasoned about with the rest of the server.
