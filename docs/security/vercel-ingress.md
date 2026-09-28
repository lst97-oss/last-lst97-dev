# Vercel ingress and client IP trust

Production chat and contact rate limits use Vercel's platform-overwritten `x-forwarded-for` request header. The application reads it only when the `VERCEL=1` runtime marker is present, and accepts exactly one valid IPv4 or IPv6 literal. Missing, malformed, or comma-separated values fail closed so rate-limited requests never fall back to a shared production identity.

Chat diagnostics use the same validated address and may record Vercel's country, region code, city, and timezone headers. They omit location when the request has no trusted address and never collect coordinates or postal codes. Browser metadata remains parsed from the user-agent without retaining the raw header.

Vercel provides the ingress boundary for these headers. Do not route production traffic through a separate Cloudflare Tunnel for this application. Cloudflare R2 and Turnstile settings are unrelated and remain configured through their existing integrations.

Configure independent values of at least 32 characters for `RATE_LIMIT_HASH_SECRET` and `CHAT_CONTEXT_SIGNING_SECRET`. `TYPESAFE_API_KEY` is also required by the chat integration. Keep these values in Vercel's environment-variable settings and out of source control.
