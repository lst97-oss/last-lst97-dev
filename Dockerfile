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
# provide dummy build-time values. They are NOT baked into the final image
# as runtime config — compose/env_file supplies real values at run time.
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG PAYLOAD_SECRET=build-only-dummy-secret-override-at-runtime-1234567890
ARG DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET} \
    DATABASE_URL=${DATABASE_URL}
# --disable-transpile: skip tsx and let Bun load TS natively. tsx's loader
# (tsx:// namespace) fails under Bun on Linux even though it works on macOS.
RUN bunx --bun payload --disable-transpile generate:types \
  && bunx --bun payload --disable-transpile generate:importmap \
  && bunx --bun vite build

# ---------------------------------------------------------------------------
# runner: minimal production image.
# - prod node_modules only (sharp/pg/drizzle stay external to the bundle)
# - dist + public + the source files Payload needs at runtime
#   (payload.config.ts + src/ for `payload migrate` and config loading)
# - non-root `bun` user (ships in the official image)
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile \
  && rm -rf /root/.bun/install/cache /root/.cache /tmp/*

# Copy build output and runtime-needed source with correct ownership.
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/public ./public
COPY --chown=bun:bun payload.config.ts tsconfig.json ./
COPY --chown=bun:bun src ./src
# Prefer the freshly generated import map from the build stage over a
# possibly stale host copy (payload-types.ts / import map are gitignored).
COPY --from=build --chown=bun:bun /app/src/payload-import-map.ts ./src/payload-import-map.ts
COPY --chown=bun:bun docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

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
CMD ["bun", "./dist/server/server.js"]
