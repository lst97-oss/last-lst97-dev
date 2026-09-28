# syntax=docker/dockerfile:1

# Pinned Bun version. Bump via --build-arg BUN_VERSION=... and keep it in
# sync with the locally used Bun version (`bun --version`).
ARG BUN_VERSION=1.4.1

# ---------------------------------------------------------------------------
# base: shared slim (Debian/glibc) runtime.
# Slim, NOT alpine: sharp ships glibc prebuilds and breaks on musl.
# ---------------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# ---------------------------------------------------------------------------
# deps: install all dependencies (incl. devDeps needed for the build).
# Copy only manifests first so this layer is cached until deps change.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# build: produce dist/client + dist/server.
# Payload validates env at import time (PAYLOAD_SECRET, DATABASE_URL), so
# pass dummy build-time values inline. They live only in this RUN layer —
# real values come from the container runtime environment, never the image.
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Standalone container server. Vercel deployments use the default
# (`vercel`) preset; see the preset override in vite.config.ts.
ENV NITRO_PRESET=node-server
# --disable-transpile: skip tsx and let Bun load TS natively. tsx's loader
# (tsx:// namespace) fails under Bun on Linux even though it works on macOS.
RUN export PAYLOAD_SECRET=build-only-dummy-secret-override-at-runtime-1234567890 \
    DATABASE_URL=postgres://postgres:postgres@localhost:5432/app \
  && bunx --bun payload --disable-transpile generate:types \
  && bunx --bun payload --disable-transpile generate:importmap \
  && bunx --bun vite build

# ---------------------------------------------------------------------------
# runner: minimal production image.
# - prod node_modules only (sharp/pg/drizzle stay external to the bundle)
# - Nitro standalone server output (.output/) + the source files Payload
#   needs at runtime (payload.config.ts + src/ for `payload migrate`)
# - non-root `bun` user (ships in the official image)
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile \
  && rm -rf /root/.bun/install/cache /root/.cache /tmp/*

# Copy Nitro output and runtime-needed source with correct ownership.
COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --chown=bun:bun payload.config.ts tsconfig.json ./
COPY --chown=bun:bun src ./src
# Prefer the freshly generated files from the build stage over possibly
# stale host copies (both are gitignored build artefacts).
COPY --from=build --chown=bun:bun /app/src/payload-import-map.ts ./src/payload-import-map.ts
COPY --from=build --chown=bun:bun /app/payload-types.ts ./payload-types.ts
COPY --chown=bun:bun --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production

USER bun

EXPOSE 3000

# Bun is always present, so no curl/wget dependency for the health probe.
# /api/site/health returns { status: 'ok' } with cache-control: no-store.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/site/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
# Nitro node-server output; honors PORT/HOST (defaults 3000/0.0.0.0).
CMD ["bun", ".output/server/index.mjs"]
