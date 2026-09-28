# Vercel Ingress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the repository's production SSR app and API routes on Vercel with per-visitor rate limiting that trusts only Vercel's client IP header, without a Cloudflare Tunnel.

**Architecture:** Centralize Vercel runtime detection and strict `x-forwarded-for` parsing in a server security helper. Use it for both rate limiting and chat diagnostics, then configure TanStack Start's Nitro Vite integration with the explicit Vercel preset to emit Vercel-compatible functions.

**Tech Stack:** TypeScript, TanStack Start, Vite, Nitro, Bun, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-09-28-vercel-ingress-design.md`

## Global Constraints

- Vercel production IP trust requires `VERCEL=1` and exactly one valid IP literal in `x-forwarded-for`; missing, invalid, or multiple values fail closed.
- The same validated IP feeds rate limiting and optional diagnostics.
- Diagnostics may record country, region code, city, and timezone; never coordinates.
- Local development keeps its shared non-IP rate-limit identity.
- Remove the Cloudflare origin verification secret and Tunnel instructions; retain unrelated Cloudflare R2 and Turnstile integrations.
- Add only the Nitro Vite integration needed for Vercel SSR and API routes.
- Update existing tests that assert Cloudflare IP behavior; do not add or run tests.

## Review Focus

- Production without the Vercel runtime marker: rate-limited request fails closed; covered in the existing production rejection case.
- Missing, invalid, or comma-separated client IP: request fails closed; covered by the existing malformed/missing IP cases.
- Valid IPv4 and IPv6 values: rate-limit key is HMACed and diagnostics include only the trusted address; covered by existing IPv4 and IPv6 cases.
- Spoofed forwarded headers in local development: stable local identity is retained; covered by the existing development identity case.
- Visitor supplied Cloudflare IP or location headers without Vercel trust: diagnostics omit IP and location; covered by the existing untrusted metadata case.

---

### Task 1: Replace Cloudflare IP trust with Vercel ingress trust

**Files:**
- Create: `src/server/security/vercel-client-ip.ts`
- Modify: `src/server/security/client-key.ts`
- Modify: `src/server/security/rate-limit-runtime.ts`
- Modify: `src/server/env-schema.ts`
- Modify: `src/server/env.ts`
- Modify: `src/server/observability/chat-request-metadata.ts`
- Modify: `src/routes/api.site.chat.ts`
- Modify: `src/server/chat/AGENTS.md`
- Modify: `.env.example`
- Delete: `docker-compose.yml` (compose removed; remote database, Vercel hosting)
- Modify: `docs/security/cloudflare-tunnel.md` (replace with `docs/security/vercel-ingress.md`)
- Delete: `src/server/security/cloudflare-origin.ts`
- Update in place: `tests/server/request-security.test.ts`
- Update in place: `tests/server/chat-request-metadata.test.ts`

**Interfaces:**
- `vercelClientIpFromRequest(request: Request, vercelRuntime: boolean): string | undefined` returns an address only when the Vercel runtime marker is true and `x-forwarded-for` contains one valid IP literal.
- `clientKeyFromRequest(request, secret, production, vercelRuntime)` uses that address in production, retains the existing local identity outside production, and throws when production trust is unavailable.
- `isVercelRuntime(): boolean` reads the `VERCEL` system variable through the Bun/Node runtime environment.
- `chatRequestMetadataFromRequest(request, { production, vercelRuntime })` uses the same address and Vercel's country, country-region, city, and timezone headers.

- [ ] **Step 1: Update the existing request security cases**

In `tests/server/request-security.test.ts`, update the three existing cases in place:

- Rename the first to `HMACs the Vercel forwarded client IP and never returns the raw value`; pass `x-forwarded-for: 203.0.113.8` and `vercelRuntime: true`; assert the key matches 64 lowercase hex characters and excludes the IP.
- Rename the second to `fails closed when production has no trusted Vercel IP`; assert rejection for a missing IP and for a valid header with `vercelRuntime: false`.
- Keep `uses a stable development identity without trusting forwarded headers`; assert different forwarded IPs still produce the same development key.

- [ ] **Step 2: Implement the shared Vercel client IP helper**

In `src/server/security/vercel-client-ip.ts`, export `vercelClientIpFromRequest(request: Request, vercelRuntime: boolean): string | undefined`. Read only `x-forwarded-for`; reject a missing value, a comma, or a value that is not accepted by `node:net`'s `isIP`; do not read Cloudflare headers.

- [ ] **Step 3: Wire rate limiting to the helper**

Remove the Cloudflare verification argument and check from `clientKeyFromRequest`. Production requires a value from `vercelClientIpFromRequest`; development keeps `local-development-client`. Export `isVercelRuntime()` from `env.ts` using the existing Bun/Node runtime environment access pattern. Pass its result through both `rate-limit-runtime.ts` and `api.site.chat.ts`.

- [ ] **Step 4: Update existing diagnostics metadata cases**

In `tests/server/chat-request-metadata.test.ts`, update the four existing cases in place:

- Rename the first to `collects trusted Vercel IP and coarse location with browser metadata`; use `x-forwarded-for`, `x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`, and `x-vercel-ip-timezone`, with production and Vercel runtime enabled. Expect the trusted IP, country, region code, city, timezone, browser, language, and referrer path.
- Rename the second to `does not trust forwarded IP or location headers outside Vercel runtime`; pass valid-looking headers with `vercelRuntime: false` and assert no IP or location is recorded.
- Keep the IPv6 case and assert `2001:db8::1` is included only with Vercel runtime enabled.
- Keep the malformed-IP/privacy case; use a comma-separated `x-forwarded-for`, include Vercel coordinate headers and a secret-bearing referrer, then assert the IP is omitted and neither coordinates nor referrer query data appear.

- [ ] **Step 5: Wire diagnostics and remove Cloudflare origin configuration**

Use the same Vercel helper in `chat-request-metadata.ts`, pass production/runtime state from `api.site.chat.ts`, map only Vercel country, region code, city, and timezone, and remove the Cloudflare secret from `env-schema.ts` and `env.ts`. Delete `cloudflare-origin.ts`.

- [ ] **Step 6: Replace the Tunnel documentation**

Replace `docs/security/cloudflare-tunnel.md` with a short Vercel ingress guide describing `VERCEL=1`, platform-overwritten `x-forwarded-for`, strict parsing, and fail-closed behavior. Update the chat architecture note and `.env.example` to remove Tunnel and origin-secret instructions while retaining unrelated Cloudflare services. (`docker-compose.yml` was deleted; there is no Compose comment to update.)

- [ ] **Step 7: Review the focused diff**

Run: `git diff --check`
Expected: no whitespace errors; `rg` finds no inbound-trust or Tunnel references to `CLOUDFLARE_ORIGIN_VERIFY_SECRET`, `CF-Connecting-IP`, `x-origin-verification`, or `cloudflared` outside preserved R2/Turnstile product mentions and historical source data.

### Task 2: Emit Vercel-compatible TanStack Start output

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `vite.config.ts`

**Interfaces:**
- The existing `build` script remains the build entrypoint.
- Nitro's Vite plugin uses `preset: 'vercel'` to emit the server and API routes in Vercel's supported deployment format.

- [ ] **Step 1: Add Nitro as a build dependency**

Add the `nitro` package as a development dependency and update `bun.lock` with Bun's package manager.

- [ ] **Step 2: Register Nitro after the existing Start and React plugins**

Import `{ nitro }` from `nitro/vite` and add `nitro({ preset: 'vercel' })` to the end of the existing `plugins` array in `vite.config.ts`, preserving the current RSC plugin order.

- [ ] **Step 3: Confirm the complete source diff**

Run: `git diff --check`
Expected: no whitespace errors; the diff contains only ingress trust, Tunnel documentation removal, Vercel output configuration, and the approved implementation plan/spec.

- [ ] **Step 4: Commit on `dev` and open a PR**

Create logical commits on `dev`, push the branch to `origin`, and open a pull request targeting `main`. Do not push directly to `main`.

- [ ] **Step 5: Deploy after merge**

After the PR is reviewed and merged, deploy the approved `main` commit to the existing `lst97-dev` Vercel project when a production deployment is requested.

- [ ] **Step 6: Verify the Vercel production result**

Confirm the CLI reports a ready production deployment and that the existing production alias resolves to it. Do not run the test suite.
