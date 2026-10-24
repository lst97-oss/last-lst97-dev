# One deployment, two databases, and a tenancy model in front of every thread

- **Category:** Architecture
- **Source ID:** last-comments-architecture-and-tenancy
- **URL:** https://www.lst97.dev/projects/last-comments
- **Visibility:** Public

`last-comments` is a self-hosted comment service built on Payload v4, TanStack Start, Bun, and PostgreSQL. The application is also its own first consumer: a public site with a blog and documentation, the Payload admin at `/admin`, the moderation dashboard at `/moderation`, the comments API, a generated OpenAPI reference, and the plugin pipeline all run in one deployment.

The separate `last-comments-widgets` repository is the client side. It publishes one npm package with native React, Vue, Angular, and plain-HTML widgets on top of one framework-free API client and one shared theme.

## Two databases, on purpose

The application uses two PostgreSQL databases, and the split is architectural rather than incidental.

**The Payload database** owns the CMS: Payload admin users, posts, and media. Its schema is managed by Payload with `push: false` and committed migrations, so a Payload upgrade cannot rewrite comment tables.

**The business database** owns the comment domain: Better Auth users, sessions, accounts, and verification rows; sites and their allowed origins; site memberships and instance admins; pages and their page keys; comments, votes, blocks, and verified users; moderation events; API keys; and the plugin event and delivery outbox.

A CMS migration cannot touch comment data, and a comment migration cannot touch editorial content. The comment service uses a Bun-native SQL client with Drizzle and its own migration directory.

## The tenancy model

Above the commenter identity sits a small, explicit tenancy model:

- An **instance admin** manages sites and API keys.
- A **site membership** is `admin` or `moderator` and is scoped to one site.
- A **site key** identifies a tenant to a widget. It is public: it selects a site, it does not authorise an account.
- **API keys** are separate and scoped. Instance keys carry `sites:create`, `sites:read`, `sites:update`, and `sites:delete`. Site keys carry `pages:read`, `pages:write`, and `pages:delete`. Delete is deliberately separate from write, so an existing write-only key cannot remove a thread until it is granted that scope.
- A **page key** is an optional stable identity for a thread. This site uses `<collection>-<id>`, so a slug change moves the page without orphaning its comments.

Moderation never accepts an API key. It is session-only, and the moderation POST is additionally checked against the application origin. A shared key must not be able to impersonate a moderator.

## Origins and the request boundary

Every site registers its allowed origins. List and write requests answer only an origin registered for that site, with credentialed CORS. A page on the same registrable domain can call the API directly; a page on a different domain needs a same-origin proxy for signed-in features, because the session cookie is not sent cross-site.

The request flow inside the application is the same for every module: a thin route adapter extracts the request, `withContext` assigns a request ID and maps errors, the application use case orchestrates, and the infrastructure layer owns SQL. Responses always use `{ data }` or `{ error: { code, message } }`; 5xx messages are hidden on the wire and kept in logs.

## Why this shape

The separation buys three things that matter for a comment system. The CMS can be replaced without exporting comment history. A comment-domain migration can be reviewed and tested without Payload's schema diff. And the tenancy boundary is small enough to state in one screen: instance admin, site role, public site key, scoped API key. Every endpoint can then ask one question — which site is this, and what may this caller do there — before it touches a row.
