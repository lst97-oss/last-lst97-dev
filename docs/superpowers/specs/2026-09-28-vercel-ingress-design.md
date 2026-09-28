# Vercel ingress and client IP design

## Goal

Run this repository's production chat and contact endpoints on Vercel without a Cloudflare Tunnel, while preserving per-visitor rate limits and the current diagnostics privacy boundary.

## Request trust

- Trust the `x-forwarded-for` value Vercel supplies. Vercel documents that it overwrites this header and does not forward the external value, preventing client IP spoofing.
- Require the Vercel runtime marker for production IP trust, then accept only one valid IP literal. Missing, malformed, or multiple values fail closed for rate-limited endpoints.
- Reuse the same trusted-IP extraction for chat diagnostics. Continue recording only the IP and coarse location fields already allowed by the diagnostics contract; use Vercel's country, region, city, and timezone headers and omit coordinates.
- Keep local development's shared non-IP rate-limit identity so local traffic does not depend on proxy headers.

## Remove Cloudflare Tunnel dependency

- Remove the Cloudflare origin verification secret from runtime environment parsing and remove the origin-verification helper and its call sites.
- Replace the Cloudflare Tunnel security guide with Vercel ingress guidance. Remove the Tunnel-only advice from Compose comments while retaining the existing loopback-only local port binding.
- Keep Cloudflare R2 and Turnstile integrations; they are unrelated to inbound request trust.

## Vercel deployment output

- Add TanStack Start's Nitro Vite integration and its dependency so the SSR server and API routes are emitted in a Vercel-compatible deployment output.
- Keep the existing project source, route behavior, and providers unchanged beyond ingress trust and the deployment adapter.

## Scope and verification

Update the server env schema, rate-limit and chat-diagnostics request paths, security documentation, and the Vite/package configuration. Update any existing tests whose assertions encode the removed Cloudflare headers. Do not add a Cloudflare deployment rule or Tunnel. Do not run the test suite; the Vercel production build will be the deployment verification.

After implementation, commit and push the source changes to GitHub `main`, then deploy that pushed commit to the existing Vercel project.
