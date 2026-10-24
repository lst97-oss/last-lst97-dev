# Four native widgets, one client, one theme, one published package

- **Category:** Frontend
- **Source ID:** last-comments-widgets
- **URL:** https://www.lst97.dev/projects/last-comments
- **Visibility:** Public

The widget repository exists because a comment system is only as usable as the client a host can drop into a page. It ships one npm package, `@lst97-oss/last-comments-widgets`, with native implementations for React, Vue, Angular, and plain HTML. Framework parity is the product: a user-visible behaviour that lands in one framework and not the others is a bug.

## One package, six entry points

The package exposes `/react`, `/vue`, `/angular`, and `/vanilla` for the four widgets, `/client` for hosts rendering their own UI, and `/theme.css` plus a per-framework stylesheet. Each subpath ships built ESM and compiled CSS, so a consumer installs the package and the libraries for the framework it actually uses and adds no build step.

Framework libraries are optional peers. A React host never installs Vue or Angular, and a plain-HTML host installs nothing beyond the package. The one published package is assembled from private workspace sources, so a consumer cannot mix a widget with a client version it cannot work with.

## The shared client

Everything difficult lives in `@lst97-oss/last-comments-widgets/client`:

- A fetch wrapper and `ApiError`, with every server error code mapped to user-facing copy by `describeError`.
- A markdown renderer that strips raw HTML and restricts links to `http(s)` and `mailto`.
- Thread helpers: `listCommentsPage`, `loadThreadWindow`, `buildCommentTree`, and the pager's accumulation logic.
- Auth helpers for the session probe, OAuth sign-in, and sign-out.
- Theme mapping from the `themeVars` object to CSS custom properties.

The four widgets import that client rather than reimplementing the protocol. They render the same DOM contract — the same `.lc-*` hooks and `data-lc-*` attributes — so styling and browser tests can target one shape across frameworks.

## What a host gets

- A list, a composer, a pager, skeleton cards, and one error block. `CommentViewer` renders the same thread with no composer and no actions for pages that only display comments.
- **Thread-aware pagination.** The API returns a flat stream with no total. A page is a window over top-level threads, with replies included, and orphan replies are promoted to roots rather than disappearing.
- **An identity control.** A signed-in viewer can post as themselves or anonymously; a guest posts with a display name and Turnstile. The composer stays disabled until the session probe answers, so a comment cannot post with a guessed identity.
- **Markdown with optional upgrades.** KaTeX math and Mermaid diagrams are loaded lazily and only when a comment contains one. Shiki code highlighting is currently React-only; the other ports keep plain fenced blocks until they are migrated.
- **Moderation mode.** Passing `viewerRole` renders inline actions and posts through `/api/moderation`, so a dashboard origin does not need to be in the public site's allow-list.
- **One theme object.** `themeVars` covers colours, typography, spacing, radii, shadows, and visibility switches. Styles are scoped with native CSS `@scope`, so importing the stylesheet does not reset the host page.
- **Lazy mode.** `lazy` defers every request, including the session probe, until the widget scrolls into view.

## Host requirements

The page origin must be registered for the site, or every request fails with `ORIGIN_NOT_ALLOWED`. Posting needs the site's Turnstile site key, because the server verifies every comment. Same-domain hosts can call the API directly with credentialed CORS; a different registrable domain needs a same-origin proxy for signed-in features.

Every failure renders one block with a title, the API's own message when it is human-readable, and an action only when one helps. The copy comes from the shared client, never from a per-widget string, so an error code cannot drift between frameworks.

This site is a consumer: the React widget and its stylesheet load lazily below each post, project deep-dive, and changelog entry, themed through CSS variables and pointed at the hosted service.
