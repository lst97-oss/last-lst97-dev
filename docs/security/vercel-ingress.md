# Vercel ingress and client IP trust

Production chat and contact rate limits use Vercel's platform-overwritten `x-forwarded-for` request header. The application reads it only when the `VERCEL=1` runtime marker is present, and accepts exactly one valid IPv4 or IPv6 literal. Missing, malformed, or comma-separated values fail closed so rate-limited requests never fall back to a shared production identity.

Chat diagnostics use the same validated address and may record Vercel's country, region code, city, and timezone headers. They omit location when the request has no trusted address and never collect coordinates or postal codes. Browser metadata remains parsed from the user-agent without retaining the raw header.

Vercel provides the ingress boundary for these headers. Do not route production traffic through a separate Cloudflare Tunnel for this application. Cloudflare R2 and Turnstile settings are unrelated and remain configured through their existing integrations.

Configure independent values of at least 32 characters for `RATE_LIMIT_HASH_SECRET` and `CHAT_CONTEXT_SIGNING_SECRET`. `OPENROUTER_API_KEY` (or a dedicated `DECISION_API_KEY`) is also required by the chat integration's decision model. Keep these values in Vercel's environment-variable settings and out of source control.

## Bot protection

`POST /api/site/chat` and `POST /api/site/contact` sit behind Vercel BotID as well as Turnstile. The client half is `initBotId()` in `src/client.tsx`, which attaches the challenge headers to those two paths; the server half is `checkBotId()` in `src/server/security/botid.ts`, called by both handlers after the rate limit and before Turnstile. The two lists must agree: a path declared on the client but not checked on the server only adds latency, and a path checked on the server but not declared on the client is rejected as a bot.

BotID is enabled for Vercel builds only (`__VERCEL_RUNTIME__` in `vite.config.ts`), because Vercel serves the challenge script on the deployed origin and a local server does not. BotID is additive: Turnstile still decides the request, so a failed BotID check degrades to "not a bot" and logs `bot.unavailable` rather than rejecting the visitor. Expect `curl` to a protected route to be rejected in production — the challenge runs in the browser session, so test from a page in the site.
