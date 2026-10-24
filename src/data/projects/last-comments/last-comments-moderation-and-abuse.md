# Moderation is a state machine, and abuse control is on the write path

- **Category:** Security & Abuse Prevention
- **Source ID:** last-comments-moderation-and-abuse
- **URL:** https://www.lst97.dev/projects/last-comments
- **Visibility:** Public

A comment system is judged by what happens when someone abuses it. `last-comments` puts the controls on the write path and keeps the moderation state explicit, so a bad comment is contained rather than discovered later.

## Comment and page states

A comment is `visible`, `hidden`, or `deleted`. Hiding is reversible and keeps the body for review; deleting is a tombstone rather than a hard delete. A comment can also be pinned, which is how a moderator keeps a useful answer at the top of a thread. A page can be locked, which disables new comments and replies without deleting existing ones. A user can be blocked on a site, with an optional expiry and reason, and verified users are tracked separately.

The moderation dashboard at `/moderation` is the operator surface. It lists sites and pages, opens a thread with the same widget the public site uses, and stacks the actions beside it: pin, hide, restore, delete, lock the page, block or verify a user. It also carries instance stats, a leaderboard, recent activity, API key management, site settings, and takedown history.

Every mutation writes a moderation event with the actor, target, action, reason, and timestamp. Deleting a page removes its comments, replies, and votes, but the audit record keeps the URL and the action. The dashboard renders the real widget — markdown, nesting, pinned order, and hidden or deleted badges — so there is no second rendering path that can drift from what visitors see.

## Abuse controls on the write path

The controls are installed and enabled by default:

- **Turnstile** verifies every comment, signed-in ones included. A missing or invalid token fails with 403; an unavailable verifier fails closed with 503. The widget renders the challenge and matches its light or dark mode to its own theme.
- **Rate limiting** is per site and requester: creates at 5 per 10 minutes, edits and deletes at 20 per 10 minutes, and votes at 60 per minute. Signed-in requests use the user ID. Guests use a keyed HMAC of the resolved client IP, so the raw address is never stored.
- **Trusted ingress** decides which address is real. The socket peer is used unless the request came from a trusted ingress, in which case its client IP header is used. Loopback and private networks are trusted by default; anything else must be configured. A direct client cannot rotate `x-real-ip` to dodge the limit.
- **Content screening** combines a local bad-words engine with an OpenRouter decision model. A hit hides the comment for review instead of rejecting the write. Provider failure resolves through a configurable fail-open path rather than blocking every comment.

## Author controls

A guest post receives a one-time edit key and only its hash is stored. The key works for the guest edit window, ten minutes by default, and `0` means unlimited. Signed-in authors can edit their own comments at any time. Deletes stay session-only: there is no edit key for deletion and no API-key path, because deleting is not an identity a shared key should borrow.

Votes are one per user per comment. Casting again switches the vote; clearing it is a separate request. The API returns an aggregate score and the viewer's own vote, never the voter list.

## Why fail closed

The ordering matters. The origin is checked first, then identity, then the rate limiter, Turnstile, and screening before a row is inserted. An error in the verification provider does not become an open door; it becomes a 503. The one deliberate exception is screening, which is advisory: a broken screener allows the comment rather than blocking the entire site. That asymmetry is the design — verification is a gate, screening is a review queue.
